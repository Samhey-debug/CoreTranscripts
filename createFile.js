import { Octokit } from "octokit";

export default async function handler(req, res) {
  const { name, content } = req.query;

  if (!name || !content) {
    return res.status(400).json({ error: "Missing 'name' or 'content' query parameter" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "your-github-username"; // Replace with your GitHub username
  const REPO_NAME = "your-repo-name"; // Replace with your repository name
  const BRANCH = "main"; // Replace with your branch name

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Step 1: Fetch the branch reference and latest commit
    const branchData = await octokit.graphql(
      `
      query ($owner: String!, $name: String!, $branch: String!) {
        repository(owner: $owner, name: $name) {
          ref(qualifiedName: $branch) {
            target {
              ... on Commit {
                oid
                tree {
                  oid
                }
              }
            }
          }
        }
      }
      `,
      { owner: REPO_OWNER, name: REPO_NAME, branch: `refs/heads/${BRANCH}` }
    );

    const branchCommit = branchData.repository.ref.target.oid;
    const baseTree = branchData.repository.ref.target.tree.oid;

    // Step 2: Create a new blob (file content)
    const blobData = await octokit.graphql(
      `
      mutation ($owner: String!, $name: String!, $content: Base64String!) {
        createBlob(input: {repositoryId: $name, owner: $owner, content: $content, encoding: BASE64}) {
          blob {
            oid
          }
        }
      }
      `,
      {
        owner: REPO_OWNER,
        name: REPO_NAME,
        content: Buffer.from(content).toString("base64"),
      }
    );

    const blobOid = blobData.createBlob.blob.oid;

    // Step 3: Create a new tree with the new blob
    const treeData = await octokit.graphql(
      `
      mutation ($owner: String!, $name: String!, $baseTree: String!, $path: String!, $blobOid: String!) {
        createTree(input: {baseTree: $baseTree, entries: [{path: $path, mode: "100644", type: "blob", oid: $blobOid}]}) {
          tree {
            oid
          }
        }
      }
      `,
      {
        owner: REPO_OWNER,
        name: REPO_NAME,
        baseTree,
        path: name,
        blobOid,
      }
    );

    const newTree = treeData.createTree.tree.oid;

    // Step 4: Create a new commit
    const commitData = await octokit.graphql(
      `
      mutation ($owner: String!, $name: String!, $message: String!, $treeOid: String!, $parentOid: String!) {
        createCommit(input: {repositoryId: $name, owner: $owner, message: $message, tree: $treeOid, parents: [$parentOid]}) {
          commit {
            oid
          }
        }
      }
      `,
      {
        owner: REPO_OWNER,
        name: REPO_NAME,
        message: `Add file: ${name}`,
        treeOid: newTree,
        parentOid: branchCommit,
      }
    );

    const newCommit = commitData.createCommit.commit.oid;

    // Step 5: Update the branch reference to point to the new commit
    await octokit.graphql(
      `
      mutation ($owner: String!, $name: String!, $branch: String!, $commitOid: String!) {
        updateRef(input: {repositoryId: $name, owner: $owner, ref: $branch, oid: $commitOid, force: true}) {
          ref {
            name
          }
        }
      }
      `,
      {
        owner: REPO_OWNER,
        name: REPO_NAME,
        branch: `refs/heads/${BRANCH}`,
        commitOid: newCommit,
      }
    );

    return res.status(200).json({ message: "File created successfully", filePath: name });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

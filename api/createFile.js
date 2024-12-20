import { Octokit } from "octokit";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const { name, content } = req.query;

  if (!name || !content) {
    return res.status(400).json({ error: "Missing 'name' or 'content' parameter." });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const owner = "Samhey-debug"; // Replace with your GitHub username
  const repo = "CoreTranscripts";       // Replace with your repository name
  const branch = "main";               // Replace with your branch name if different

  const octokit = new Octokit({ auth: githubToken });

  try {
    // Get the current commit and tree SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const baseTree = refData.object.sha;

    // Create the file blob
    const { data: blobData } = await octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
    });

    // Create the new tree
    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree: [
        {
          path: name,
          mode: "100644", // File mode
          type: "blob",
          sha: blobData.sha,
        },
      ],
    });

    // Commit the new tree
    const { data: commitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `Add ${name}`,
      tree: treeData.sha,
      parents: [baseTree],
    });

    // Update the reference
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commitData.sha,
    });

    res.status(201).json({ message: `File '${name}' created successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create file.", details: error.message });
  }
}

import { Octokit } from "octokit";
import fetch from "node-fetch";

export default async function handler(req, res) {
  const githubToken = process.env.GITHUB_TOKEN;
  const vercelDeployHook = process.env.VERCEL_DEPLOY_HOOK; // Add your deploy hook URL here

  const owner = "Samhey-debug"; // Replace with your GitHub username
  const repo = "CoreTranscripts";       // Replace with your repository name
  const branch = "main";               // Replace with your branch name if different
  const octokit = new Octokit({ auth: githubToken });

  const { name, content } = req.query;

  if (!name || !content) {
    return res.status(400).json({ error: "Missing 'name' or 'content' parameter." });
  }

  if (!name.endsWith(".html")) {
    return res.status(400).json({ error: "Only .html files are supported." });
  }

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

    // Trigger Vercel deploy hook
    if (vercelDeployHook) {
      await fetch(vercelDeployHook, { method: "POST" });
    }

    res.status(201).json({ message: `File '${name}' created successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create file.", details: error.message });
  }
}

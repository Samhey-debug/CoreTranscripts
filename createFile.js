import { Octokit } from "octokit";

export default async function handler(req, res) {
  const { name, content } = req.query;

  if (!name || !content) {
    return res.status(400).json({ error: "Missing 'name' or 'content' query parameter" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = "Samhey-debug"; // Replace with your GitHub username
  const REPO_NAME = "CoreTranscripts"; // Replace with your repository name
  const BRANCH = "main"; // Replace with the branch you want to use

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    // Check if the file already exists
    let sha;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: name,
        ref: BRANCH,
      });
      sha = existingFile.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    // Create or update the file
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: name,
      message: `Add or update file: ${name}`,
      content: Buffer.from(content).toString("base64"),
      branch: BRANCH,
      sha,
    });

    return res.status(200).json({ message: "File created/updated successfully", data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

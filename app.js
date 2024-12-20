const axios = require("axios");

module.exports = async (req, res) => {
  const { name, content } = req.query;

  if (!name || !content) {
    return res.status(400).json({ error: "Missing 'name' or 'content' query parameter." });
  }

  // GitHub repository details
  const GITHUB_REPO = "Samhey-debug/CoreTranscripts"; // Replace with your repo (e.g., 'username/repo')
  const GITHUB_BRANCH = "main"; // Branch where the file will be created
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this as an environment variable

  // GitHub API URL
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${name}`;

  try {
    // Get the current time for commit message
    const commitMessage = `Create file: ${name}`;

    // Prepare the request body
    const requestBody = {
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      branch: GITHUB_BRANCH,
    };

    // Send request to GitHub API
    const response = await axios.put(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      message: `File '${name}' created successfully.`,
      fileUrl: response.data.content.html_url,
    });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: "Failed to create the file.",
      details: error.response ? error.response.data : error.message,
    });
  }
};

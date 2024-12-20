import discordTranscripts from 'discord-html-transcripts';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Configure your GitHub repository details
const GITHUB_OWNER = 'Samhey-debug';
const GITHUB_REPO = 'CoreTranscripts';
const BRANCH = 'main';  // or whatever branch you want to use

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channelID } = req.query;

  // Validate channelID
  if (!channelID) {
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  try {
    // Generate transcript
    const transcript = await discordTranscripts.createTranscript(channelID, {
      saveImages: true,
      poweredBy: false,
      filename: `${channelID}.html`
    });

    // Get transcript content
    const transcriptContent = transcript.toString();

    // Create or update file in GitHub
    const fileResponse = await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `transcripts/${channelID}.html`,
      message: `Add transcript for channel ${channelID}`,
      content: Buffer.from(transcriptContent).toString('base64'),
      branch: BRANCH,
    });

    // Trigger Vercel deployment if needed
    if (process.env.VERCEL_DEPLOY_HOOK) {
      await fetch(process.env.VERCEL_DEPLOY_HOOK, {
        method: 'POST',
      });
    }

    // Return the URL to the created file
    const fileUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${BRANCH}/transcripts/${channelID}.html`;
    
    return res.status(200).json({
      success: true,
      url: fileUrl,
      sha: fileResponse.data.content.sha,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

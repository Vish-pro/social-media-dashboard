async function main() {
  console.log("Fetching posts from local API...");
  try {
    const res = await fetch("http://localhost:3000/api/posts?workspaceId=cmpdd6xza0005xyzbla8pqiqd");
    const data = await res.json();
    console.log("API POSTS:");
    for (const post of data.posts || []) {
      console.log(`Content: "${post.content}"`);
      console.log(`Status: ${post.status}`);
      console.log(`platformSettings:`, post.platformSettings);
      console.log(`metrics:`, post.metrics);
      console.log("---");
    }
  } catch (err) {
    console.error("Failed to fetch posts:", err.message);
  }
}

main();

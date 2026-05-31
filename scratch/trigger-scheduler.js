async function main() {
  console.log("Triggering the scheduler publish queue...");
  try {
    const res = await fetch("http://localhost:3000/api/scheduler/publish");
    const data = await res.json();
    console.log("Scheduler Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to trigger scheduler:", err.message);
  }
}

main();

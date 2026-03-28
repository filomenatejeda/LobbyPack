export default function Home() {
  return (
    <main style={styles.main}>
      <h1>Welcome to MyStore 🚀</h1>
      <p>Your place to find the best collectibles.</p>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    padding: "40px",
    textAlign: "center",
  },
};
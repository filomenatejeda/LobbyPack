import Navbar from "./Navbar";

export default function Header() {
  return (
    <header style={styles.header}>
      <h2 style={styles.logo}>MyStore</h2>
      <Navbar />
    </header>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    backgroundColor: "#111",
    color: "#fff",
  },
  logo: {
    margin: 0,
  },
};
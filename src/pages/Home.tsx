export default function Home() {
  return (
    <main style={styles.main}>
      <h1>Esto es LobbyPack</h1>
      <p>Aquí lo recibirás <i>todo.</i></p>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    padding: "40px",
    textAlign: "center",
  },
};
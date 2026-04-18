import checkIfAuth from "@/lib/checkAuth";

export default function Dashboard() {
	checkIfAuth()


	return (
		<main>
			<h2>Sesión iniciada (en página protegida por login).</h2>
		</main>
	);
}
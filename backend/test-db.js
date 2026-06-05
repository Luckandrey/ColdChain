import dotenv from "dotenv";

dotenv.config();

const { pool } = await import("./src/db.js");

console.log("Testando conexão com o banco...");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);

try {
  const resultado = await pool.query("SELECT NOW() AS agora;");
  console.log("Conectado ao banco com sucesso!");
  console.log(resultado.rows[0]);
} catch (error) {
  console.error("Erro real ao conectar no banco:");
  console.error(error);
} finally {
  await pool.end();
}
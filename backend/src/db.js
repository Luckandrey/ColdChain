import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

console.log("Configuração do banco carregada:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_SSL:", process.env.DB_SSL);

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

export async function testarConexaoBanco() {
  const resultado = await pool.query("SELECT NOW() AS agora");

  console.log("Conectado ao PostgreSQL RDS:", resultado.rows[0].agora);
}
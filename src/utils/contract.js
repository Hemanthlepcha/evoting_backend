import { JsonRpcProvider, Wallet, Contract } from "ethers";
import crypto from "crypto";
import fs from "fs";
import "dotenv/config";
import { logger } from "./logger.js";

const abiData = JSON.parse(fs.readFileSync("./contracts/abi/Evoting.json", "utf-8"));
const abi = abiData.abi;

const provider = new JsonRpcProvider(process.env.AMOY_RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;

export const contract = new Contract(contractAddress, abi, wallet);

export function hashUid(uid) {
  const secretUid = process.env.SECRET_PHRASE + uid;
  return crypto.createHash("sha256").update(secretUid).digest("hex");
}

export { logger };
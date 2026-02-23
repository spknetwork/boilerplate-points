const bip39 = require("bip39");
const ecc = require("tiny-secp256k1");
const { BIP32Factory } = require("bip32");
const bip32 = BIP32Factory(ecc);
const bitcoin = require("bitcoinjs-lib");
const { ethers } = require("ethers");
const { Keypair } = require("@solana/web3.js");
const TronWeb = require("tronweb");
const { TonWeb } = require("tonweb");
const { AptosAccount } = require("aptos");

// Generate or use existing mnemonic
const mnemonic = bip39.generateMnemonic();
console.log("Mnemonic:", mnemonic);

// Convert mnemonic to seed
const seed = bip39.mnemonicToSeedSync(mnemonic);
const root = bip32.fromSeed(seed);

const getMemonic = async () => {
  // ===== BITCOIN =====
  const btcPath = "m/44'/0'/0'/0/0";
  const btcChild = root.derivePath(btcPath);
  const btcAddress = bitcoin.payments.p2pkh({
    pubkey: btcChild.publicKey,
    network: bitcoin.networks.bitcoin,
  }).address;
  console.log("BTC:", btcAddress);

  // ===== ETHEREUM =====
  const ethPath = "m/44'/60'/0'/0/0";
  const ethChild = root.derivePath(ethPath);
  const ethPrivateKey = "0x" + ethChild.privateKey.toString("hex"); // ✅ FIXED
  const ethWallet = new ethers.Wallet(ethPrivateKey);
  console.log("ETH:", ethWallet.address);

  // ===== POLYGON ===== (same derivation as Ethereum)
  console.log("POLYGON:", ethWallet.address);

  // ===== BNB (Smart Chain) ===== (same derivation as Ethereum)
  console.log("BNB (Smart Chain):", ethWallet.address);

  // ===== TRON =====
  const tronPath = "m/44'/195'/0'/0/0";
  const tronChild = root.derivePath(tronPath);
  const tronPrivateKey = tronChild.privateKey.toString("hex"); // ✅ FIXED
  const tronWeb = new TronWeb();
  const tronAddress = tronWeb.address.fromPrivateKey(tronPrivateKey);
  console.log("TRX:", tronAddress);

  // ===== SOLANA =====
  const solPath = "m/44'/501'/0'/0'";
  const solChild = root.derivePath(solPath);
  const solKeypair = Keypair.fromSeed(solChild.privateKey.slice(0, 32));
  console.log("SOL:", solKeypair.publicKey.toBase58());

  // ===== TON =====
  const tonPath = "m/44'/607'/0'/0/0";
  const tonChild = root.derivePath(tonPath);
  console.log("TON (public key hex):", tonChild.publicKey.toString("hex"));
  // ⚠️ Generating a full TON wallet address requires deploying or referencing a TonWeb wallet contract

  // ===== APTOS =====
  const aptosPath = "m/44'/637'/0'/0'/0'";
  const aptosChild = root.derivePath(aptosPath);
  const aptosPrivateKey = Buffer.from(aptosChild.privateKey); // ✅ FIXED
  const aptosAccount = new AptosAccount(aptosPrivateKey);
  console.log("APTOS:", aptosAccount.address().hex());
};

getMemonic();

module.exports = { getMemonic };

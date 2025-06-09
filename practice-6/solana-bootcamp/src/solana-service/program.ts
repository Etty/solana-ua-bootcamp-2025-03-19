import { AnchorProvider, Program, Wallet, web3, BN } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { PublicKey } from "@solana/web3.js";

import escrowIdl from "./escrow.json";
import { Escrow } from "./idlType";
import { config } from "./config";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { randomBytes } from "crypto";

export class EscrowProgram {
  protected program: Program<Escrow>;
  protected connection: web3.Connection;
  protected wallet: NodeWallet;

  constructor(connection: web3.Connection, wallet: Wallet) {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    this.program = new Program<Escrow>(escrowIdl as Escrow, provider);
    this.wallet = wallet;
    this.connection = connection;
  }

  createOfferId = (offerId: BN) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("offer"),
        this.wallet.publicKey.toBuffer(),
        offerId.toArrayLike(Buffer, "le", 8),
      ],
      new PublicKey(config.contractAddress)
    )[0];
  };

  async makeOffer(
    tokenMintA: PublicKey,
    tokenMintB: PublicKey,
    tokenAmountA: number,
    tokenAmountB: number
  ) {
    try {
      const accountInfoA = await this.connection.getAccountInfo(tokenMintA);
      const accountInfoB = await this.connection.getAccountInfo(tokenMintB);
      const tokenProgram = accountInfoA!.owner;
      if (tokenProgram.toBase58() != accountInfoB!.owner.toBase58()) {
        throw new Error("Token program must be same for both tokens");
      }
      const offerId = new BN(randomBytes(8));
      const offerAddress = this.createOfferId(offerId);

      const vault = getAssociatedTokenAddressSync(
        tokenMintA,
        offerAddress,
        true,
        tokenProgram
      );
      const makerTokenAccountA = getAssociatedTokenAddressSync(
        tokenMintA,
        this.wallet.publicKey,
        true,
        tokenProgram
      );
      const makerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        this.wallet.publicKey,
        true,
        tokenProgram
      );
      const accounts = {
        maker: this.wallet.publicKey,
        tokenMintA: tokenMintA,
        makerTokenAccountA,
        tokenMintB: tokenMintB,
        makerTokenAccountB,
        vault,
        offer: offerAddress,
      };

      const txInstruction = await this.program.methods
        .makeOffer(offerId, new BN(tokenAmountA), new BN(tokenAmountB))
        .accounts({ ...accounts, tokenProgram: tokenProgram })
        .instruction();

      const messageV0 = new web3.TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [txInstruction],
      }).compileToV0Message();

      const versionedTransaction = new web3.VersionedTransaction(messageV0);

      if (!this.program.provider.sendAndConfirm) return;

      const response = await this.program.provider.sendAndConfirm(
        versionedTransaction
      );
      if (!this.program.provider.publicKey) return;

      return response;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async takeOffer(
    maker: PublicKey,
    offer: PublicKey,
    tokenMintA: PublicKey,
    tokenMintB: PublicKey
  ) {
    try {
      const accountInfoA = await this.connection.getAccountInfo(tokenMintA);
      const accountInfoB = await this.connection.getAccountInfo(tokenMintB);
      const tokenProgram = accountInfoA!.owner;
      if (tokenProgram.toBase58() != accountInfoB!.owner.toBase58()) {
        throw new Error("Token program must be same for both tokens");
      }
      const takerTokenAccountA = getAssociatedTokenAddressSync(
        tokenMintA,
        this.wallet.publicKey,
        true,
        tokenProgram
      );
      const takerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        this.wallet.publicKey,
        true,
        tokenProgram
      );
      const makerTokenAccountB = getAssociatedTokenAddressSync(
        tokenMintB,
        maker,
        true,
        tokenProgram
      );

      const vault = getAssociatedTokenAddressSync(
        tokenMintA,
        offer,
        true,
        tokenProgram
      );
      const accounts = {
        maker,
        offer,
        taker: this.wallet.publicKey,
        takerTokenAccountA,
        takerTokenAccountB,
        vault,
        tokenProgram: tokenProgram,
        makerTokenAccountB,
      };

      const txInstruction = await this.program.methods
        .takeOffer()
        .accounts({
          ...accounts,
        })
        .instruction();

      const messageV0 = new web3.TransactionMessage({
        payerKey: this.wallet.publicKey,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
        instructions: [txInstruction],
      }).compileToV0Message();

      const versionedTransaction = new web3.VersionedTransaction(messageV0);

      if (!this.program.provider.sendAndConfirm) return;

      const response = await this.program.provider.sendAndConfirm(
        versionedTransaction
      );
      return response;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

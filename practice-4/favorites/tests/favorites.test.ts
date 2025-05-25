import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Favorites } from "../target/types/favorites";
import { getCustomErrorMessage } from "@solana-developers/helpers";
import { expect, describe, test } from "@jest/globals";
import { systemProgramErrors } from "./system-program-errors";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import "dotenv/config";

// const anchor = require("@coral-xyz/anchor");
const program = anchor.workspace.Favorites as Program<Favorites>;

const createUser = async (): Promise<anchor.web3.Keypair> => {
  const user = web3.Keypair.generate();

  const provider = anchor.getProvider();

  let topUpAccTx = new anchor.web3.Transaction();
  topUpAccTx.instructions = [
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: user.publicKey,
      lamports: 10 * LAMPORTS_PER_SOL,
    }),
  ];
  await provider.sendAndConfirm(topUpAccTx, []);
  return user;
};

const createFavoritesTx = async (
  user: anchor.web3.Keypair,
  number: anchor.BN,
  color: string
): Promise<void> => {
  let tx: string | null = null;
  try {
    tx = await program.methods
      .setFavorites(number, color)
      .accounts({
        user: user.publicKey,
        // Note that both `favorites` and `system_program` are added
        // automatically.
      })
      // Sign the transaction
      .signers([user])
      // Send the transaction to the cluster or RPC
      .rpc();
  } catch (thrownObject) {
    // Let's properly log the error, so we can see the program involved
    // and (for well known programs) the full log message.

    const rawError = thrownObject as Error;
    throw new Error(
      getCustomErrorMessage(systemProgramErrors, rawError.message)
    );
  }
};

const updateFavoritesTx = async (
  user: anchor.web3.Keypair,
  number?: anchor.BN,
  color?: string
): Promise<void> => {
  let txU: string | null = null;
  try {
    txU = await program.methods
      .updateFavorites(
        typeof number !== "undefined" ? number : null,
        typeof color !== "undefined" ? color : null
      )
      .accounts({
        user: user.publicKey,
        // Note that both `favorites` and `system_program` are added
        // automatically.
      })
      // Sign the transaction
      .signers([user])
      // Send the transaction to the cluster or RPC
      .rpc();
  } catch (thrownObject) {
    // Let's properly log the error, so we can see the program involved
    // and (for well known programs) the full log message.

    const rawError = thrownObject as Error;
    throw new Error(
      getCustomErrorMessage(systemProgramErrors, rawError.message)
    );
  }
};

describe("favorites", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Writes our favorites to the blockchain", async () => {
    const user = await createUser();
    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

    // Make a transaction to write to the blockchain
    await createFavoritesTx(user, favoriteNumber, favoriteColor);

    // Calculate the PDA account address that holds the user's favorites
    const [favoritesPda, _favoritesBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from("favorites"), user.publicKey.toBuffer()],
        program.programId
      );

    // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(favoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(favoriteNumber.toNumber());
  });

  it("Update both number & color", async () => {
    const user = await createUser();
    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

    // Make a transaction to write to the blockchain
    await createFavoritesTx(user, favoriteNumber, favoriteColor);

    const newFavoriteNumber = new anchor.BN(15);
    const newFavoriteColor = "blue";

    // Make update
    await updateFavoritesTx(user, newFavoriteNumber, newFavoriteColor);
    // Calculate the PDA account address that holds the user's favorites
    const [favoritesPda, _favoritesBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from("favorites"), user.publicKey.toBuffer()],
        program.programId
      );

    // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(newFavoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(newFavoriteNumber.toNumber());
  });
  it("Update number only", async () => {
    const user = await createUser();
    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

    // Make a transaction to write to the blockchain
    await createFavoritesTx(user, favoriteNumber, favoriteColor);

    const newFavoriteNumber = new anchor.BN(40);

    // Make update
    await updateFavoritesTx(user, newFavoriteNumber);
    // Calculate the PDA account address that holds the user's favorites
    const [favoritesPda, _favoritesBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from("favorites"), user.publicKey.toBuffer()],
        program.programId
      );
    // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(favoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(newFavoriteNumber.toNumber());
  });
  it("Update color only", async () => {
    const user = await createUser();
    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

    // Make a transaction to write to the blockchain
    await createFavoritesTx(user, favoriteNumber, favoriteColor);

    const newFavoriteColor = "green";

    // Make update
    await updateFavoritesTx(user, null, newFavoriteColor);
    // Calculate the PDA account address that holds the user's favorites
    const [favoritesPda, _favoritesBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from("favorites"), user.publicKey.toBuffer()],
        program.programId
      );
    // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(newFavoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(favoriteNumber.toNumber());
  });
  it("Testing favorites update when authority was set and unset", async () => {
    const user = await createUser();
    // Here's what we want to write to the blockchain
    const favoriteNumber = new anchor.BN(23);
    const favoriteColor = "red";

    // Make a transaction to write to the blockchain
    await createFavoritesTx(user, favoriteNumber, favoriteColor);
    const authority = await createUser();

    let txU: string | null = null;
    try {
      txU = await program.methods
        .setAuthority(authority.publicKey)
        .accounts({
          user: user.publicKey,
          id: authority.publicKey,
        })
        .signers([user, authority])
        .rpc();
    } catch (thrownObject) {
      const rawError = thrownObject as Error;
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message)
      );
    }

    const newFavoriteColor = "green";

    // Make update
    await updateFavoritesTx(user, null, newFavoriteColor);
    // Check if update by owner works after authority adding
    const [favoritesPda, _favoritesBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from("favorites"), user.publicKey.toBuffer()],
        program.programId
      );
    // And make sure it matches!
    const dataFromPda = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPda.color).toEqual(newFavoriteColor);
    expect(dataFromPda.number.toNumber()).toEqual(favoriteNumber.toNumber());

    const favoriteNumberA = new anchor.BN(15);
    const favoriteColorA = "yellow";
    try {
      txU = await program.methods
        .updateFavoritesByAuthority(favoriteNumberA, favoriteColorA)
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
    } catch (thrownObject) {
      console.log(thrownObject);
      const rawError = thrownObject as Error;
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message)
      );
    }
    // Check if update by authority works
    const dataFromPdaA = await program.account.favorites.fetch(favoritesPda);
    expect(dataFromPdaA.color).toEqual(favoriteColorA);
    expect(dataFromPdaA.number.toNumber()).toEqual(favoriteNumberA.toNumber());

    // Unset authority
    try {
      txU = await program.methods
        .setAuthority(null)
        .accounts({
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
    } catch (thrownObject) {
      console.log(thrownObject);
      const rawError = thrownObject as Error;
      throw new Error(
        getCustomErrorMessage(systemProgramErrors, rawError.message)
      );
    }

    // check that unset authority doesn't have any more permission to update favorites, so values are preserved
    try {
      txU = await program.methods
        .updateFavoritesByAuthority(new anchor.BN(20), "orange")
        .accounts({
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
    } catch (thrownObject) {
      expect(dataFromPdaA.color).toEqual(favoriteColorA);
      expect(dataFromPdaA.number.toNumber()).toEqual(
        favoriteNumberA.toNumber()
      );
    }
  });
});

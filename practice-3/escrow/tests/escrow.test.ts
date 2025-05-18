import { expect, describe, beforeAll, test } from "@jest/globals";
import * as anchor from "@coral-xyz/anchor";
import { type Program, BN } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

import { confirmTransaction, makeKeypairs } from "@solana-developers/helpers";

const TOKEN_PROGRAM = TOKEN_PROGRAM_ID;

export const getRandomBigNumber = (size: number = 8) => {
  return new BN(randomBytes(size));
};

function areBnEqual(a: unknown, b: unknown): boolean | undefined {
  const isABn = a instanceof BN;
  const isBBn = b instanceof BN;

  if (isABn && isBBn) {
    return a.eq(b);
  } else if (isABn === isBBn) {
    return undefined;
  } else {
    return false;
  }
}
expect.addEqualityTesters([areBnEqual]);

const createTokenAndMintTo = async (
  connection: Connection,
  payer: PublicKey,
  tokenMint: PublicKey,
  decimals: number,
  mintAuthority: PublicKey,
  mintTo: Array<{ recepient: PublicKey; amount: number }>
): Promise<Array<TransactionInstruction>> => {
  let minimumLamports = await getMinimumBalanceForRentExemptMint(connection);

  let createTokeIxs = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: tokenMint,
      lamports: minimumLamports,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM,
    }),
    createInitializeMint2Instruction(
      tokenMint,
      decimals,
      mintAuthority,
      null,
      TOKEN_PROGRAM
    ),
  ];

  let mintToIxs = mintTo.flatMap(({ recepient, amount }) => {
    const ataAddress = getAssociatedTokenAddressSync(
      tokenMint,
      recepient,
      false,
      TOKEN_PROGRAM
    );

    return [
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        ataAddress,
        recepient,
        tokenMint,
        TOKEN_PROGRAM
      ),
      createMintToInstruction(
        tokenMint,
        ataAddress,
        mintAuthority,
        amount,
        [],
        TOKEN_PROGRAM
      ),
    ];
  });

  return [...createTokeIxs, ...mintToIxs];
};

const getTokenBalanceOn =
  (connection: Connection) =>
  async (tokenAccountAddress: PublicKey): Promise<BN> => {
    const tokenBalance = await connection.getTokenAccountBalance(
      tokenAccountAddress
    );
    return new BN(tokenBalance.value.amount);
  };

// Jest debug console it too verbose.
// const jestConsole = console;

describe("escrow", () => {
  // Use the cluster and the keypair from Anchor.toml
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();

  // See https://github.com/coral-xyz/anchor/issues/3122
  // const user = (provider.wallet as anchor.Wallet).payer;
  // const payer = user;

  const connection = provider.connection;

  const program = anchor.workspace.Escrow as Program<Escrow>;

  const [alice, bob, usdcMint, wifMint, delegate, rec] = makeKeypairs(6);

  const [
    aliceUsdcAccount,
    aliceWifAccount,
    bobUsdcAccount,
    bobWifAccount,
    recUsdcAccount,
    recWifAccount,
  ] = [alice, bob, rec].flatMap((owner) =>
    [usdcMint, wifMint].map((tokenMint) =>
      getAssociatedTokenAddressSync(
        tokenMint.publicKey,
        owner.publicKey,
        false,
        TOKEN_PROGRAM
      )
    )
  );

  // Pick a random ID for the new offer.
  const offerId = getRandomBigNumber();

  // Creates Alice and Bob accounts, 2 token mints, and associated token
  // accounts for both tokens for both users.
  beforeAll(async () => {
    // global.console = require('console');

    const giveAliceAndBobSolIxs: Array<TransactionInstruction> = [
      alice,
      bob,
      rec,
    ].map((owner) =>
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: owner.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      })
    );

    const usdcSetupIxs = await createTokenAndMintTo(
      connection,
      provider.publicKey,
      usdcMint.publicKey,
      6,
      alice.publicKey,
      [
        { recepient: alice.publicKey, amount: 100_000_000 },
        { recepient: bob.publicKey, amount: 20_000_000 },
        { recepient: rec.publicKey, amount: 10 },
      ]
    );

    const wifSetupIxs = await createTokenAndMintTo(
      connection,
      provider.publicKey,
      wifMint.publicKey,
      6,
      bob.publicKey,
      [
        { recepient: alice.publicKey, amount: 5_000_000 },
        { recepient: bob.publicKey, amount: 300_000_000 },
        { recepient: rec.publicKey, amount: 10 },
      ]
    );

    // Add all these instructions to our transaction
    let tx = new Transaction();
    tx.instructions = [
      ...giveAliceAndBobSolIxs,
      ...usdcSetupIxs,
      ...wifSetupIxs,
    ];

    const _setupTxSig = await provider.sendAndConfirm(tx, [
      alice,
      bob,
      usdcMint,
      wifMint,
    ]);
  });

  // afterAll(() => {
  //   global.console = jestConsole;
  // });

  const makeOfferTx = async (
    maker: Keypair,
    offerId: BN,
    offeredTokenMint: PublicKey,
    offeredAmount: BN,
    wantedTokenMint: PublicKey,
    wantedAmount: BN
  ): Promise<{
    offerAddress: PublicKey;
    delegateAddress: PublicKey;
  }> => {
    const transactionSignature = await program.methods
      .makeOffer(offerId, offeredAmount, wantedAmount)
      .accounts({
        maker: maker.publicKey,
        tokenMintA: offeredTokenMint,
        tokenMintB: wantedTokenMint,
        delegate: delegate.publicKey,
        // As the `token_program` account is specified as
        //
        //   pub token_program: Interface<'info, TokenInterface>,
        //
        // the client library needs us to provide the specific program address
        // explicitly.
        //
        // This is unlike the `associated_token_program` or the `system_program`
        // account addresses, that are specified in the program IDL, as they are
        // expected to reference the same programs for all the `makeOffer`
        // invocations.
        tokenProgram: TOKEN_PROGRAM,
      })
      .signers([maker, delegate])
      .rpc();

    await confirmTransaction(connection, transactionSignature);

    // Both `offer` address and the `vault` address accounts are computed based
    // on the other provided account addresses, and so we do not need to provide
    // them explicitly in the `makeOffer()` account call above.  But we compute
    // them here and return for convenience.

    const [offerAddress, _offerBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("offer"),
        maker.publicKey.toBuffer(),
        offerId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const delegateAddress = getAssociatedTokenAddressSync(
      offeredTokenMint,
      offerAddress,
      true,
      TOKEN_PROGRAM
    );

    return { offerAddress, delegateAddress };
  };

  const takeOfferTx = async (
    offerAddress: PublicKey,
    taker: Keypair
  ): Promise<void> => {
    // `accounts` argument debugging tool.  Should be part of Anchor really.
    //
    // type FlatType<T> = T extends object
    //   ? { [K in keyof T]: FlatType<T[K]> }
    //   : T;
    //
    // type AccountsArgs = FlatType<
    //   Parameters<
    //     ReturnType<
    //       Program<Escrow>["methods"]["takeOffer"]
    //     >["accounts"]
    //   >
    // >;

    const transactionSignature = await program.methods
      .takeOffer()
      .accounts({
        taker: taker.publicKey,
        // maker: taker.publicKey,
        offer: offerAddress,
        delegate: delegate.publicKey,
        // See note in the `makeOfferTx` on why this program address is provided
        // and the rest are not.
        tokenProgram: TOKEN_PROGRAM,
      })
      .signers([taker, delegate])
      .rpc();

    await confirmTransaction(connection, transactionSignature);
  };

  test("Offer created by Alice, token A transfer approved", async () => {
    const offeredUsdc = new BN(10_000_000);
    const wantedWif = new BN(100_000_000);

    const getTokenBalance = getTokenBalanceOn(connection);

    const { offerAddress, delegateAddress } = await makeOfferTx(
      alice,
      offerId,
      usdcMint.publicKey,
      offeredUsdc,
      wifMint.publicKey,
      wantedWif
    );

    // Check our Offer account contains the correct data
    const offerAccount = await program.account.offer.fetch(offerAddress);
    expect(offerAccount.maker).toEqual(alice.publicKey);
    expect(offerAccount.tokenMintA).toEqual(usdcMint.publicKey);
    expect(offerAccount.tokenMintB).toEqual(wifMint.publicKey);
    expect(offerAccount.tokenBWantedAmount).toEqual(wantedWif);
  });

  test("Offer taken by Bob, tokens balances are updated", async () => {
    const getTokenBalance = getTokenBalanceOn(connection);

    // This test reuses offer created by the previous test.  Bad design :(
    // But it is a shortcut that allows us to avoid writing the cleanup code.
    // TODO Add proper cleanup, that mirrors `beforeEach`, and create a new
    // offer here.

    const [offerAddress, _offerBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("offer"),
        alice.publicKey.toBuffer(),
        offerId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await takeOfferTx(offerAddress, bob);

    expect(await getTokenBalance(aliceUsdcAccount)).toEqual(new BN(90_000_000));
    expect(await getTokenBalance(aliceWifAccount)).toEqual(new BN(105_000_000));

    expect(await getTokenBalance(bobUsdcAccount)).toEqual(new BN(30_000_000));
    expect(await getTokenBalance(bobWifAccount)).toEqual(new BN(200_000_000));
  });

  test("Alice spent tokens after offer creation, and Bob tries to take it. Checking rollbacks", async () => {
    const offeredUsdc = new BN(50_000_000);
    const wantedWif = new BN(500_000_000);

    const offerId = getRandomBigNumber();
    const { offerAddress, delegateAddress } = await makeOfferTx(
      alice,
      offerId,
      usdcMint.publicKey,
      offeredUsdc,
      wifMint.publicKey,
      wantedWif
    );

    // Alice spent some funds
    let tx = new Transaction();
    tx.add(
      createTransferCheckedInstruction(
        aliceUsdcAccount, // from
        usdcMint.publicKey, // mint
        recUsdcAccount, // to
        alice.publicKey, // from's owner
        80_000_000, // amount
        6 // decimals
      )
    );
    // Send Transaction here.
    await connection.sendTransaction(tx, [alice]);

    const getTokenBalance = getTokenBalanceOn(connection);
    const aliceBalanceBefore = await getTokenBalance(aliceUsdcAccount);
    const bobBalanceBefore = await getTokenBalance(bobWifAccount);

    // Bob tries to accept an offer
    try {
      await takeOfferTx(offerAddress, bob);
    } catch (e) {
      // Verify payments rollback in case of fail
      expect(await getTokenBalance(aliceUsdcAccount)).toEqual(
        aliceBalanceBefore
      );
      expect(await getTokenBalance(bobWifAccount)).toEqual(bobBalanceBefore);
    }
  });

  test("Bob tries to take an offer with insufficient funds. Checking rollbacks", async () => {
    const offeredUsdc = new BN(50_000_000);
    const wantedWif = new BN(500_000_000);

    const offerId = getRandomBigNumber();
    const { offerAddress, delegateAddress } = await makeOfferTx(
      alice,
      offerId,
      usdcMint.publicKey,
      offeredUsdc,
      wifMint.publicKey,
      wantedWif
    );

    let tx = new Transaction();
    tx.add(
      createTransferCheckedInstruction(
        bobWifAccount, // from
        wifMint.publicKey, // mint
        recWifAccount, // to
        bob.publicKey, // from's owner
        200_000_000, // amount
        6 // decimals
      )
    );
    // Send Transaction here.
    await connection.sendTransaction(tx, [bob]);

    const getTokenBalance = getTokenBalanceOn(connection);
    const aliceBalanceBefore = await getTokenBalance(aliceUsdcAccount);
    const bobBalanceBefore = await getTokenBalance(bobWifAccount);

    // Bob tries to accept an offer
    try {
      await takeOfferTx(offerAddress, bob);
    } catch (e) {
      // Verify payments rollback in case of fail
      expect(await getTokenBalance(aliceUsdcAccount)).toEqual(
        aliceBalanceBefore
      );
      expect(await getTokenBalance(bobWifAccount)).toEqual(bobBalanceBefore);
    }
  });
});

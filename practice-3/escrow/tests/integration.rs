use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use env_logger;
use escrow::program;
use solana_sdk::{signature::Keypair, signer::Signer};

#[tokio::test]
async fn test_make_offer() {
    env_logger::init();
    let mut program_test = ProgramTest::new("escrow", program::id(), None);

    let (mut banks_client, payer, recent_blockhash) = program_test.start().await;

    let maker = Keypair::new();
    let taker = Keypair::new();
    let mint_a = Keypair::new();
    let mint_b = Keypair::new();
    let vault = Keypair::new();

    let token_a_offered_amount: u64 = 1000;
    let token_b_wanted_amount: u64 = 500;
    let offer_id: u64 = 1;

    // Step 1: Maker sends tokens to vault
    let make_offer_tx = program::make_offer(
        &banks_client,
        &payer,
        &recent_blockhash,
        &maker,
        offer_id,
        token_a_offered_amount,
        token_b_wanted_amount,
    )
    .await
    .unwrap();

    // ✅ Verify that the vault received the correct amount
    assert_eq!(vault.lamports(), token_a_offered_amount);
    msg!("✅ Offer successfully created");

    // Step 2: Taker accepts the offer
    let take_offer_tx = program::take_offer(&banks_client, &payer, &recent_blockhash, &taker)
        .await
        .unwrap();

    // ✅ Ensure the funds are transferred properly
    assert_eq!(taker.lamports(), token_b_wanted_amount);
    assert_eq!(maker.lamports(), token_a_offered_amount);
    msg!("✅ Offer successfully taken");
}

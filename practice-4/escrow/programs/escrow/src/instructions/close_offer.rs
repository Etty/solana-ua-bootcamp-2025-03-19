use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked, close_account,
        transfer_checked,
    },
};

use crate::Offer;

#[derive(Accounts)]
pub struct CloseOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        mut,
        close = maker,

        has_one = token_mint_a,
    )]
    offer: Account<'info, Offer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn close(context: Context<CloseOffer>) -> Result<()> {
    let transfer_accounts = TransferChecked {
        from: context.accounts.vault.to_account_info(),
        mint: context.accounts.token_mint_a.to_account_info(),
        to: context.accounts.maker_token_account_a.to_account_info(),
        authority: context.accounts.offer.to_account_info(),
    };

    let signer_seeds: [&[&[u8]]; 1] = [&[
        b"offer",
        context.accounts.maker.to_account_info().key.as_ref(),
        &context.accounts.offer.id.to_le_bytes()[..],
        &[context.accounts.offer.bump],
    ]];

    let cpi_context = CpiContext::new_with_signer(
        context.accounts.token_program.to_account_info(),
        transfer_accounts,
        &signer_seeds,
    );

    transfer_checked(
        cpi_context,
        context.accounts.offer.token_a_offered_amount,
        context.accounts.token_mint_a.decimals,
    );

    let closeVault = CloseAccount {
        account: context.accounts.vault.to_account_info(),
        destination: context.accounts.maker.to_account_info(),
        authority: context.accounts.offer.to_account_info(),
    };

    let cpi_context_vault = CpiContext::new_with_signer(
        context.accounts.token_program.to_account_info(),
        closeVault,
        &signer_seeds,
    );

    close_account(cpi_context_vault);

    Ok(())
}

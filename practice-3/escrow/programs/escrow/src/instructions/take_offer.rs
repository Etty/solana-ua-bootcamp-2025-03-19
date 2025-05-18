use anchor_lang::prelude::*;

use crate::Offer;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ApproveChecked, Revoke, approve_checked, revoke},
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
};

#[derive(Accounts)]
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub token_mint_a: Box<InterfaceAccount<'info, Mint>>,

    pub token_mint_b: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_b: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        // mut,
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_a: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = token_mint_a,
        has_one = token_mint_b,
        // seeds = [b"offer", maker.key().as_ref(), offer.id.to_le_bytes().as_ref()],
        // bump = offer.bump
    )]
    offer: Account<'info, Offer>,

    #[account(mut)]
    pub delegate: Signer<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn approve_token_b_transfer(ctx: &Context<TakeOffer>) -> Result<()> {
    let cpi_accounts = ApproveChecked {
        mint: ctx.accounts.token_mint_b.to_account_info(),
        to: ctx.accounts.taker_token_account_b.to_account_info(),
        delegate: ctx.accounts.delegate.to_account_info(),
        authority: ctx.accounts.taker.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

    approve_checked(
        cpi_context,
        ctx.accounts.offer.token_b_wanted_amount,
        ctx.accounts.token_mint_b.decimals,
    )?;
    Ok(())
}

pub fn swap_tokens(ctx: &Context<TakeOffer>) -> Result<()> {
    let transfer_to_taker = TransferChecked {
        from: ctx.accounts.maker_token_account_a.to_account_info(),
        mint: ctx.accounts.token_mint_a.to_account_info(),
        to: ctx.accounts.taker_token_account_a.to_account_info(),
        authority: ctx.accounts.delegate.to_account_info(),
    };

    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_to_taker,
    );
    transfer_checked(
        cpi_context,
        ctx.accounts.offer.token_a_offered_amount,
        ctx.accounts.token_mint_a.decimals,
    );

    let transfer_to_maker = TransferChecked {
        from: ctx.accounts.taker_token_account_b.to_account_info(),
        mint: ctx.accounts.token_mint_b.to_account_info(),
        to: ctx.accounts.maker_token_account_b.to_account_info(),
        authority: ctx.accounts.delegate.to_account_info(),
    };

    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_to_maker,
    );
    transfer_checked(
        cpi_context,
        ctx.accounts.offer.token_b_wanted_amount,
        ctx.accounts.token_mint_b.decimals,
    )
}

pub fn revoke_approvals(ctx: &Context<TakeOffer>) -> Result<()> {
    // let signer_seeds: [&[&[u8]]; 1] = [&[
    //     b"offer",
    //     ctx.accounts.maker.to_account_info().key.as_ref(),
    //     &ctx.accounts.offer.id.to_le_bytes()[..],
    //     &[ctx.accounts.offer.bump],
    // ]];
    // let revoke_maker = Revoke {
    //     source: ctx.accounts.maker_token_account_a.to_account_info(),
    //     authority: ctx.accounts.maker.to_account_info(),
    // };
    // let cpi_program = ctx.accounts.token_program.to_account_info();
    // let cpi_context = CpiContext::new_with_signer(cpi_program, revoke_maker, &signer_seeds);
    // revoke(cpi_context)?;

    let revoke_taker = Revoke {
        source: ctx.accounts.taker_token_account_b.to_account_info(),
        authority: ctx.accounts.taker.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, revoke_taker);
    revoke(cpi_context)?;
    Ok(())
}

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FXAxfUgPgK5WZMcKkCqBC28twcvg57LowieqtSnJD2BE");

#[program]
pub mod escrow {
    use super::*;

    pub fn make_offer(
        context: Context<MakeOffer>,
        id: u64,
        token_a_offered_amount: u64,
        token_b_wanted_amount: u64,
    ) -> Result<()> {
        instructions::make_offer::approve_token_a_transfer(&context, token_a_offered_amount)?;
        instructions::make_offer::save_offer(
            context,
            id,
            token_a_offered_amount,
            token_b_wanted_amount,
        )
    }

    pub fn take_offer(context: Context<TakeOffer>) -> Result<()> {
        instructions::take_offer::approve_token_b_transfer(&context)?;
        instructions::take_offer::swap_tokens(&context);
        instructions::take_offer::revoke_approvals(&context);
        Ok(())
    }
}

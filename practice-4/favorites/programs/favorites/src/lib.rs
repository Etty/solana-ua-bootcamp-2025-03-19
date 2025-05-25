use anchor_lang::prelude::*;

// Our program's address! You don't need to change it.
// This matches the private key in the target/deploy directory
declare_id!("G8bVjrSqkqGa5hhjsLdn1ycMaYbU1mqqZhTc1DCMhgpA");

// Anchor programs always use
pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod favorites {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    // Our instruction handler! It sets the user's favorite number and color
    pub fn set_favorites(context: Context<SetFavorites>, number: u64, color: String) -> Result<()> {
        let user_public_key = context.accounts.user.key();
        msg!("Greetings from {}", context.program_id);
        msg!(
            "User {}'s favorite number is {} and favorite color is: {}",
            user_public_key,
            number,
            color
        );

        context
            .accounts
            .favorites
            .set_inner(Favorites { number, color });
        Ok(())
    }

    pub fn update_favorites(
        context: Context<UpdateFavorites>,
        number: Option<u64>,
        color: Option<String>,
    ) -> Result<()> {
        let favorites: &mut Favorites = &mut context.accounts.favorites;

        let mut nb = number;
        match nb.as_mut() {
            Some(c) => favorites.number = *c,
            None => {}
        }
        let mut col = color;
        match col.as_mut() {
            Some(c) => favorites.color = c.clone(),
            None => {}
        }
        *context.accounts.favorites = favorites.clone();
        Ok(())
    }

    pub fn set_authority(context: Context<SetAuthority>, authority: Option<Pubkey>) -> Result<()> {
        let user_public_key = context.accounts.user.key();

        let (favorites_pda, _bump) = Pubkey::find_program_address(
            &[b"favorites", user_public_key.as_ref()],
            &context.program_id,
        );

        context.accounts.authority.set_inner(Authority {
            key: authority,
            owner: user_public_key,
            favorites: favorites_pda,
        });
        Ok(())
    }

    pub fn update_favorites_by_authority(
        context: Context<UpdateFavoritesByAuthority>,
        number: Option<u64>,
        color: Option<String>,
    ) -> Result<()> {
        let favorites: &mut Favorites = &mut context.accounts.favorites;

        let mut nb = number;
        match nb.as_mut() {
            Some(c) => favorites.number = *c,
            None => {}
        }
        let mut col = color;
        match col.as_mut() {
            Some(c) => favorites.color = c.clone(),
            None => {}
        };

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,

    #[max_len(50)]
    pub color: String,
}

#[account]
#[derive(InitSpace)]
pub struct Authority {
    pub key: Option<Pubkey>,
    pub owner: Pubkey,
    pub favorites: Pubkey,
}

// When people call the set_favorites instruction, they will need to provide the accounts that will
// be modified. This keeps Solana fast!
#[derive(Accounts)]
pub struct SetFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Favorites::INIT_SPACE,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut)]
    pub id: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Authority::INIT_SPACE,
        seeds = [b"authority", id.key().as_ref()],
        bump,
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFavoritesByAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"authority", authority.key().as_ref()],
        bump,
    )]
    pub authority_data: Account<'info, Authority>,

    #[account(mut, seeds = [b"favorites", authority_data.owner.key().as_ref()],
        bump)]
    pub favorites: Account<'info, Favorites>,

    pub system_program: Program<'info, System>,
}

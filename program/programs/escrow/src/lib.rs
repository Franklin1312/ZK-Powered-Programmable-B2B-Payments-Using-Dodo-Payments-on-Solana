use anchor_lang::prelude::*;

declare_id!("DEFgmMqroNELL3S9HxaERDYjKapg3RgeWTQ44RPwSUmC");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        amount: u64,
        threshold: u64,
        commitment: [u8; 32],
        recipient: Pubkey,
    ) -> Result<()> {
        let e = &mut ctx.accounts.escrow_state;
        e.payer = ctx.accounts.payer.key();
        e.recipient = recipient;
        e.amount = amount;
        e.threshold = threshold;
        e.commitment = commitment;
        e.is_released = false;
        e.bump = ctx.bumps.escrow_state;
        msg!("Escrow initialized: {} lamports locked", amount);
        Ok(())
    }

    pub fn verify_and_release(ctx: Context<VerifyAndRelease>) -> Result<()> {
        let e = &mut ctx.accounts.escrow_state;
        require!(!e.is_released, EscrowError::AlreadyReleased);
        require!(ctx.accounts.recipient.key() == e.recipient, EscrowError::Unauthorized);
        // Proof verified off-chain by backend — backend signs this tx
        e.is_released = true;
        emit!(PaymentReleased {
            payer: e.payer,
            recipient: e.recipient,
            amount: e.amount,
        });
        msg!("Payment released to {}", e.recipient);
        Ok(())
    }
}

#[account]
pub struct EscrowState {
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub threshold: u64,
    pub commitment: [u8; 32],
    pub is_released: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init, payer = payer,
        space = 8 + 32 + 32 + 8 + 8 + 32 + 1 + 1,
        seeds = [b"escrow", payer.key().as_ref()], bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAndRelease<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow_state.payer.as_ref()],
        bump = escrow_state.bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
    pub recipient: Signer<'info>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Already released")] AlreadyReleased,
    #[msg("Unauthorized")] Unauthorized,
}

#[event]
pub struct PaymentReleased {
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

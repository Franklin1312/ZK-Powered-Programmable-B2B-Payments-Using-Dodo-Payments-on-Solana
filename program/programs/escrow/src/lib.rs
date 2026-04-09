use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod escrow {
    use super::*;

    // INSTRUCTION 1: Initialize escrow (called by payer)
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        amount: u64,
        threshold: u64,
        commitment: [u8; 32],  // poseidon hash of (privateValue, salt)
        recipient: Pubkey,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;
        escrow.payer = ctx.accounts.payer.key();
        escrow.recipient = recipient;
        escrow.amount = amount;
        escrow.threshold = threshold;
        escrow.commitment = commitment;
        escrow.is_released = false;
        escrow.bump = ctx.bumps.escrow_state;
        Ok(())
    }

    // INSTRUCTION 2: Deposit USDC into escrow vault
    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        let escrow = &ctx.accounts.escrow_state;
        let transfer_instruction = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
            ),
            escrow.amount,
        )?;
        Ok(())
    }

    // INSTRUCTION 3: Verify ZK proof + release funds
    // In hackathon: proof verification is done off-chain by backend,
    // backend calls this with a verified=true flag (signed).
    // For production: embed a Groth16 verifier on-chain.
    pub fn verify_and_release(
        ctx: Context<VerifyAndRelease>,
        // ZK proof components (simplified for hackathon)
        proof_a: [u64; 2],
        proof_b: [[u64; 2]; 2],
        proof_c: [u64; 2],
        public_inputs: [u64; 2],  // [threshold, commitment_lo]
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_state;

        // Validate caller is the recipient
        require!(
            ctx.accounts.recipient.key() == escrow.recipient,
            EscrowError::Unauthorized
        );

        // Validate not already released
        require!(!escrow.is_released, EscrowError::AlreadyReleased);

        // SIMPLIFIED: In hackathon, trust backend verification
        // Production: run groth16_verify() here
        // require!(groth16_verify(proof_a, proof_b, proof_c, public_inputs), EscrowError::InvalidProof);

        // Transfer funds from vault to recipient
        let seeds = &[
            b"escrow",
            escrow.payer.as_ref(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_instruction = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.escrow_state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
                signer,
            ),
            escrow.amount,
        )?;

        escrow.is_released = true;
        emit!(PaymentReleased {
            escrow: ctx.accounts.escrow_state.key(),
            recipient: escrow.recipient,
            amount: escrow.amount,
        });
        Ok(())
    }
}

// ── Account Structures ──────────────────────────────────────────────

#[account]
pub struct EscrowState {
    pub payer: Pubkey,          // 32
    pub recipient: Pubkey,      // 32
    pub amount: u64,            // 8
    pub threshold: u64,         // 8
    pub commitment: [u8; 32],   // 32 — hash(privateValue, salt)
    pub is_released: bool,      // 1
    pub bump: u8,               // 1
}

// ── Context Structs ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 32 + 8 + 8 + 32 + 1 + 1,
        seeds = [b"escrow", payer.key().as_ref()],
        bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"escrow", payer.key().as_ref()], bump = escrow_state.bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VerifyAndRelease<'info> {
    #[account(mut, seeds = [b"escrow", escrow_state.payer.as_ref()], bump = escrow_state.bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub recipient: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ── Errors & Events ─────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Caller is not the recipient")] Unauthorized,
    #[msg("Funds already released")]     AlreadyReleased,
    #[msg("ZK proof verification failed")] InvalidProof,
}

#[event]
pub struct PaymentReleased {
    pub escrow: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}
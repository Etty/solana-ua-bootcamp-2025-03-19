import { Connection, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useQuery } from "@tanstack/react-query";

interface TokenBalance {
  mint: string;
  amount: number;
}

async function fetchTokenAccountsList(
  connection: Connection,
  walletAddress: string
): Promise<TokenBalance[]> {
  const walletPublicKey = new PublicKey(walletAddress);

  const tokenAccountsNew = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );
  const tokenAccounts2022 = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    {
      programId: TOKEN_2022_PROGRAM_ID,
    }
  );
  const tokenAccounts = {
    value: [...tokenAccountsNew.value, ...tokenAccounts2022.value],
  };

  // Filter valid SPL tokens (non-NFT tokens with decimals > 0 and balance > 0)
  let totalItems = 0;
  const nonZeroTokenBalances = tokenAccounts.value
    .filter(({ account }) => {
      const parsedInfo = account.data.parsed.info;
      const decimals = parsedInfo.tokenAmount.decimals;

      const balanceInUI = parsedInfo.tokenAmount.uiAmountString;

      if (decimals > 0 && balanceInUI > 0) {
        // Exclude NFTs and tokens with exactly 0 balance
        totalItems++;
        return true;
      }
      return false;
    })
    .sort((a, b) => a.pubkey.toBase58().localeCompare(b.pubkey.toBase58()));

  const tokenBalances = nonZeroTokenBalances.map(({ account }) => {
    const parsedInfo = account.data.parsed.info;

    return {
      mint: parsedInfo.mint,
      amount: parsedInfo.tokenAmount.amount,
    };
  });

  const solBalance = await connection.getBalance(walletPublicKey);

  if (solBalance > 0) {
    tokenBalances.unshift({ mint: NATIVE_MINT.toBase58(), amount: solBalance });
  }

  return tokenBalances;
}

export function useTokens(walletAddress: string) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["tokenBalances", walletAddress],
    queryFn: async () => {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const balances = await fetchTokenAccountsList(connection, walletAddress);

      return balances;
    },
    enabled: !!walletAddress,
    gcTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

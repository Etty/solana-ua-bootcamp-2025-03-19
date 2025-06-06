import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { TabsContent } from "@/components/ui/tabs";

import { Loader2 } from "lucide-react";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { TokenList } from "@/components/TokenList";
import { useTokens } from "@/hooks/useTokenAccountsList";
import { PaginationControl } from "@/components/pagination-control";

export default function AccountTokens({
  isWalletConnected,
  disconnect,
  setIsWalletConnected,
  currentPage,
  onPageChange,
  loading,
}: {
  isWalletConnected: boolean;
  disconnect: () => void;
  setIsWalletConnected: (isWalletConnected: boolean) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  const { publicKey } = useWallet();

  const {
    data: tokens,
    isLoading,
    refetch,
  } = useTokens(publicKey?.toBase58() ?? "");
  if (isLoading) {
    return <div>Loading tokens...</div>;
  }

  const ITEMS_PER_PAGE = 5;

  const paginatedTokens = tokens?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil((tokens?.length ?? 1) / ITEMS_PER_PAGE);

  return (
    <TabsContent value="accountTokens">
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <div>
            <CardTitle>Your Tokens</CardTitle>
          </div>
          {isWalletConnected ? (
            <div>
              <Button
                onClick={() => {
                  try {
                    disconnect();
                    refetch();
                    setIsWalletConnected(false);
                  } catch (e) {
                    console.log("Error disconnecting", e);
                  }
                }}
              >
                Disconnect
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isWalletConnected ? (
              <div className="text-center py-8">
                <p className="mb-4 text-muted-foreground">
                  Connect your wallet to view your tokens
                </p>
                <WalletMultiButton style={{ backgroundColor: "black" }}>
                  <Button asChild disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <div>Connect Wallet</div>
                    )}
                  </Button>
                </WalletMultiButton>
              </div>
            ) : (
              <>
                <TokenList tokens={paginatedTokens!}></TokenList>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </CardFooter>
      </Card>
    </TabsContent>
  );
}

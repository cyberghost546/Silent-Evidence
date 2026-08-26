'use client';
// app/components/ui/DiscordConnect.tsx
// Settings widget for connecting a Discord account.
// Shows current connection status and a connect/disconnect button.
// Premium subscribers get the Discord Premium role automatically on connect.

interface Props {
  // Passed from the settings page server component
  discordUsername: string | null;
  isPremium: boolean;
}

export default function DiscordConnect({ discordUsername, isPremium }: Props) {
  // Check for success/error from OAuth redirect
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const justConnected = params.get('discord') === 'connected';
  const hasError = params.get('discord') === 'error';

  return (
    <div className="border border-gray-800 rounded-xl p-4 bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Discord logo */}
        <svg
          className="w-6 h-6 text-indigo-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-white">Discord</p>
          <p className="text-xs text-gray-500">
            {isPremium
              ? 'Connect to receive your Premium role in the server.'
              : 'Connect your Discord to join the Silent Evidence community server.'}
          </p>
        </div>
      </div>

      {/* Status messages */}
      {justConnected && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-3">
          ✓ Discord connected{isPremium ? ' and Premium role granted!' : ' successfully!'}
        </div>
      )}
      {hasError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          Connection failed. Please try again.
        </div>
      )}

      {discordUsername ? (
        // Already connected — show username and option to reconnect
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-gray-300">{discordUsername}</span>
          </div>
          <a
            href="/api/discord/connect"
            className="text-xs text-gray-500 hover:text-gray-300 transition underline"
          >
            Reconnect
          </a>
        </div>
      ) : (
        // Not connected — show connect button
        <a
          href="/api/discord/connect"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Connect Discord
        </a>
      )}
    </div>
  );
}

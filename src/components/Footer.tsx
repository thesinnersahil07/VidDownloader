export default function Footer() {
  return (
    <footer className="border-t border-gray-800/50 mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xl">📡</span>
            <span className="text-lg font-bold gradient-text">STREAMFETCH</span>
          </div>
          <p className="text-gray-500 text-xs max-w-xl mx-auto leading-relaxed">
            This tool is intended for publicly accessible media and authorized use. It does not bypass DRM, authentication, paywalls, or access controls. Users are responsible for respecting copyright and the terms of the source website.
          </p>
        </div>
        <div className="text-center text-xs text-gray-600">
          <p>Built with Cloudflare Pages & Workers (Free Plan)</p>
        </div>
      </div>
    </footer>
  );
}

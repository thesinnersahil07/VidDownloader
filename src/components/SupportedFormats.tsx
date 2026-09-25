export default function SupportedFormats() {
  const formats = [
    {
      name: 'HLS / M3U8',
      icon: '📡',
      desc: 'HTTP Live Streaming format used by most modern video platforms. Supports adaptive bitrate streaming.',
      note: 'May require a compatible player or FFmpeg for local MP4 conversion.'
    },
    {
      name: 'MP4',
      icon: '🎬',
      desc: 'Standard video file format. Direct download is supported where the source allows it.',
      note: 'Browser download depends on the source server\'s configuration.'
    },
    {
      name: 'WebM',
      icon: '🌐',
      desc: 'Open media format developed by Google. Supported in modern browsers.',
      note: 'Less common than MP4 but fully supported in Chrome and Firefox.'
    }
  ];

  return (
    <section id="formats" className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          <span className="gradient-text">Supported Formats</span>
        </h2>
        <p className="text-gray-400 text-sm md:text-base">Publicly accessible video sources we can detect.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {formats.map((format) => (
          <div key={format.name} className="glass-card p-6 hover:border-indigo-500/30 transition-all">
            <div className="text-3xl mb-3">{format.icon}</div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">{format.name}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">{format.desc}</p>
            <p className="text-xs text-gray-500 italic">{format.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

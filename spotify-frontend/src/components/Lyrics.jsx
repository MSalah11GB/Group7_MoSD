import { useContext, useEffect, useMemo, useRef } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { usePlayerTime } from '../context/PlayerTimeContext';
import { activeLyricIndex } from '../lib/catalog';

const Message = ({ title, hint }) => (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 pt-8">
        <p className="text-lg">{title}</p>
        {hint && <p className="text-sm mt-2">{hint}</p>}
    </div>
);

const Lyrics = () => {
    const { currentLyrics, lyricsLoading, track } = useContext(PlayerContext);
    const { currentTime } = usePlayerTime();
    const lyricsContainerRef = useRef(null);
    const activeLineRef = useRef(null);

    const activeIndex = useMemo(
        () => activeLyricIndex(currentLyrics, currentTime * 1000),
        [currentLyrics, currentTime]
    );

    // Keep the active line centered as the song plays.
    useEffect(() => {
        const container = lyricsContainerRef.current;
        const element = activeLineRef.current;
        if (!container || !element) return;

        const headerHeight = 56; // sticky header, 3.5rem
        const top = element.offsetTop - container.offsetTop -
            (container.getBoundingClientRect().height / 2) + (element.getBoundingClientRect().height / 2) - headerHeight;
        container.scrollTo({ top, behavior: 'smooth' });
    }, [activeIndex]);

    if (lyricsLoading) return <Message title="Loading lyrics..." />;

    if (!track || currentLyrics.length === 0) {
        return <Message title="No lyrics available for this song" hint="Try another song or check back later" />;
    }

    return (
        <div className="h-full">
            <div ref={lyricsContainerRef} className="h-full overflow-y-auto pb-8">
                <div className="pt-2"></div>

                {currentLyrics.map((lyric, index) => (
                    <p
                        key={index}
                        ref={index === activeIndex ? activeLineRef : null}
                        className={`py-2 transition-all duration-300 ${
                            index === activeIndex ? 'text-green-500 font-bold text-lg' : 'text-gray-300 text-base'
                        }`}
                    >
                        {lyric.text}
                    </p>
                ))}

                <div className="pb-8"></div>
            </div>
        </div>
    );
};

export default Lyrics;

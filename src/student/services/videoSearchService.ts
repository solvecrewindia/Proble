export interface VideoResult {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    publishTime: string;
    viewCount?: string;
    duration?: string;
    relevantSegment?: string; // "Top Concept" or similar label
    relevantTimestamp?: string; // "02:30"
    relevantTimestampSeconds?: number; // 150
}



// Helper to parse ISO 8601 duration
const parseDuration = (duration: string): string => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return "0:00";

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    const h = parseInt(hours || '0');
    const m = parseInt(minutes || '0');
    const s = parseInt(seconds || '0');

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Helper to find relevant timestamp and label
const findRelevantTimestamp = (description: string, query: string): { timestamp: string, seconds: number, label: string } | null => {
    const lines = description.split('\n');
    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/;
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 3);

    let firstMatch = null;

    for (const line of lines) {
        const timeMatch = line.match(timestampRegex);
        if (timeMatch) {
            let label = line.replace(timeMatch[0], '').replace(/^[-–: ]+|[-–: ]+$/g, '').trim();
            if (label.length < 2) label = "Topic";

            const result = {
                ...parseTimestampToSeconds(timeMatch[1]),
                label: label
            };

            // Save first valid timestamp as fallback
            if (!firstMatch) firstMatch = result;

            // Check for strict keyword match
            const lowerLine = line.toLowerCase();
            const hasKeyword = queryWords.some(w => lowerLine.includes(w));
            if (hasKeyword) {
                return result;
            }
        }
    }
    // Return high-quality match or fallback to first timestamp
    return firstMatch;
};

const parseTimestampToSeconds = (timestamp: string): { timestamp: string, seconds: number } => {
    const parts = timestamp.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    }
    return { timestamp, seconds };
};

// Start of dynamic mock generation helper
const generateMockVideos = (query: string): VideoResult[] => {
    return [
        {
            id: 'RBSGKlAvoiM',
            title: `Learn ${query} in 10 Minutes`,
            description: `A quick introduction to ${query}.`,
            thumbnail: 'https://img.youtube.com/vi/RBSGKlAvoiM/hqdefault.jpg',
            channelTitle: 'Education Hub',
            publishTime: '2023-01-01',
            viewCount: '1.2M views',
            duration: '10:05',
            relevantSegment: `${query} Basics`,
            relevantTimestamp: '1:30',
            relevantTimestampSeconds: 90
        },
        {
            id: '8hly31xKli0',
            title: `Mastering ${query} - Full Course`,
            description: `Deep dive into ${query} with examples.`,
            thumbnail: 'https://img.youtube.com/vi/8hly31xKli0/hqdefault.jpg',
            channelTitle: 'Tech Academy',
            publishTime: '2023-05-20',
            viewCount: '850K views',
            duration: '45:00',
            relevantSegment: `${query} Advanced`,
            relevantTimestamp: '5:15',
            relevantTimestampSeconds: 315
        },
        {
            id: 'bUHFg8CZFws',
            title: `${query} Interview Questions`,
            description: `Top questions asked about ${query}.`,
            thumbnail: 'https://img.youtube.com/vi/bUHFg8CZFws/hqdefault.jpg',
            channelTitle: 'Career Prep',
            publishTime: '2023-08-15',
            viewCount: '200K views',
            duration: '20:10'
        },
        {
            id: 'bMknfKXIFA8',
            title: `Why ${query} Matters`,
            description: `Real world applications of ${query}.`,
            thumbnail: 'https://img.youtube.com/vi/bMknfKXIFA8/hqdefault.jpg',
            channelTitle: 'Concept Explainers',
            publishTime: '2023-11-10',
            viewCount: '500K views',
            duration: '15:20',
            relevantSegment: 'Applications',
            relevantTimestamp: '3:00',
            relevantTimestampSeconds: 180
        }
    ];
};

export const searchVideos = async (query: string): Promise<{ videos: VideoResult[], error: string | null }> => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    // Use mock data if no key is present
    if (!apiKey) {
        console.warn("No VITE_YOUTUBE_API_KEY found. using mock data.");
        await new Promise(resolve => setTimeout(resolve, 800));
        return { videos: generateMockVideos(query), error: null };
    }

    try {
        const searchResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id&maxResults=4&q=${encodeURIComponent(query + ' educational tutorial')}&type=video&videoDuration=medium&key=${apiKey}`);

        if (!searchResponse.ok) {
            const errData = await searchResponse.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'Search failed');
        }

        const searchData = await searchResponse.json();
        // Fallback to dynamic mocks if real search returns empty
        if (!searchData.items?.length) return { videos: generateMockVideos(query), error: null };

        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${apiKey}`);

        if (!detailsResponse.ok) throw new Error('Details fetch failed');

        const detailsData = await detailsResponse.json();

        // Defensive check for detailsData items
        if (!detailsData.items) return { videos: generateMockVideos(query), error: null };

        const videos = detailsData.items.map((item: any) => {
            // Defensive coding for missing fields
            const duration = item.contentDetails ? parseDuration(item.contentDetails.duration) : "0:00";
            const viewCount = item.statistics?.viewCount
                ? `${Math.floor(Number(item.statistics.viewCount) / 1000)}K views`
                : 'N/A views';

            const timeData = findRelevantTimestamp(item.snippet?.description || "", query);

            return {
                id: item.id,
                title: item.snippet?.title || "Untitled Video",
                description: item.snippet?.description || "",
                thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
                channelTitle: item.snippet?.channelTitle || "Unknown Channel",
                publishTime: item.snippet?.publishedAt || "",
                viewCount: viewCount,
                duration: duration,
                relevantTimestamp: timeData?.timestamp,
                relevantTimestampSeconds: timeData?.seconds,
                relevantSegment: timeData?.label
            };
        });

        return { videos, error: null };

    } catch (error: any) {
        console.error("Video search failed, falling back to mock data:", error);

        let errorMessage = error.message || "Video search failed";

        // Map common Google API errors to actionable instructions
        if (errorMessage.includes("V3DataSearchService.List") || errorMessage.includes("blocked")) {
            errorMessage = "YouTube Data API v3 is not enabled. Enable it in Google Cloud Console.";
        } else if (errorMessage.includes("quota")) {
            errorMessage = "YouTube API quota exceeded. Try again tomorrow.";
        }

        // Fallback to dynamic mocks on any API error (quota, network, etc.)
        return { videos: generateMockVideos(query), error: errorMessage };
    }
};

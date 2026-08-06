import React, { useState, useEffect } from 'react';
import { lambdaService } from '../../services/lambdaService';

const ImpostorPatterns = () => {
    const [patterns, setPatterns] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        loadPatterns();
    }, [timeRange]);

    const loadPatterns = async () => {
        setLoading(true);
        try {
            const data = await lambdaService.getImpostorPatterns(timeRange);
            setPatterns(data);
        } catch (error) {
            console.error('Failed to load patterns:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-4">Loading your patterns...</div>;
    }

    if (!patterns) {
        return <div className="p-4">No pattern data available yet. Keep journaling!</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Your Imposter Syndrome Patterns</h2>
                <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Imposter Syndrome Frequency */}
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Detection Frequency</h3>
                    <div className="text-3xl font-bold text-blue-600">
                        {patterns.patterns.imposterSyndromeFrequency.toFixed(1)}%
                    </div>
                    <p className="text-sm text-blue-600">of entries showed signs</p>
                </div>

                {/* Average Confidence */}
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">Average Confidence</h3>
                    <div className="text-3xl font-bold text-purple-600">
                        {(patterns.patterns.averageConfidence * 100).toFixed(0)}%
                    </div>
                    <p className="text-sm text-purple-600">detection confidence</p>
                </div>

                {/* Total Entries */}
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Journal Entries</h3>
                    <div className="text-3xl font-bold text-green-600">
                        {patterns.totalEntries}
                    </div>
                    <p className="text-sm text-green-600">in {timeRange}</p>
                </div>
            </div>

            {/* Common Emotions */}
            <div className="mt-6">
                <h3 className="font-semibold text-gray-800 mb-3">Most Common Emotions</h3>
                <div className="flex flex-wrap gap-2">
                    {patterns.patterns.commonEmotions.map((emotion, index) => (
                        <span 
                            key={emotion.emotion}
                            className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                            {emotion.emotion} ({emotion.count})
                        </span>
                    ))}
                </div>
            </div>

            {/* Urgent Support Alert */}
            {patterns.patterns.urgentSupportCount > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2">Support Needed</h3>
                    <p className="text-red-700">
                        {patterns.patterns.urgentSupportCount} entries indicated urgent support was needed.
                        Please consider reaching out to a mental health professional.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImpostorPatterns;
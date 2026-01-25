import { useState, useEffect } from 'react';
import { Play, Square, Camera, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStartTimeTracking, useStopTimeTracking, useTimeEntries, useUploadScreenshots } from '@/hooks/useTimeTracking';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

interface TimeTrackerProps {
  projectId: string;
}

export const TimeTracker = ({ projectId }: TimeTrackerProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeEntryId, setTimeEntryId] = useState<string | null>(null);
  const { data: timeEntries = [] } = useTimeEntries(projectId);
  const startTracking = useStartTimeTracking();
  const stopTracking = useStopTimeTracking();
  const uploadScreenshots = useUploadScreenshots();

  const activeEntry = timeEntries.find(e => e.status === 'active');

  useEffect(() => {
    if (activeEntry) {
      setIsTracking(true);
      setTimeEntryId(activeEntry.id);
      const start = new Date(activeEntry.start_time);
      setStartTime(start);
    }
  }, [activeEntry]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setCurrentTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const handleStart = async () => {
    try {
      const result = await startTracking.mutateAsync({ projectId });
      setIsTracking(true);
      setTimeEntryId(result.id);
      setStartTime(new Date());
      setCurrentTime(0);
      toast.success('Time tracking started');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleStop = async () => {
    if (!timeEntryId) return;
    
    try {
      await stopTracking.mutateAsync({ 
        timeEntryId,
        screenshotUrls: [], // Can be enhanced to capture screenshots
      });
      setIsTracking(false);
      setTimeEntryId(null);
      setStartTime(null);
      setCurrentTime(0);
      toast.success('Time tracking stopped');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCaptureScreenshot = async () => {
    if (!timeEntryId) return;
    
    // Note: Browser screenshot capture requires screen capture API
    // This is a placeholder - you'd need to implement actual screenshot capture
    toast.info('Screenshot capture feature requires screen capture API');
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = timeEntries
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  return (
    <div className="bg-secondary border-3 border-foreground p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">Time Tracking</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={16} />
          <span>Total: {formatTime(totalTime * 60)}</span>
        </div>
      </div>

      {isTracking ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-accent mb-2">
              {formatTime(currentTime)}
            </div>
            <p className="text-sm text-muted-foreground">Currently tracking</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCaptureScreenshot}
              className="flex-1"
            >
              <Camera size={16} className="mr-2" />
              Screenshot
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              className="flex-1"
            >
              <Square size={16} className="mr-2" />
              Stop
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="accent"
          onClick={handleStart}
          className="w-full"
          disabled={startTracking.isPending}
        >
          <Play size={16} className="mr-2" />
          Start Tracking
        </Button>
      )}

      {timeEntries.length > 0 && (
        <div className="space-y-2 pt-4 border-t-3 border-foreground">
          <p className="text-sm font-display font-bold">Recent Entries</p>
          <div className="space-y-1">
            {timeEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
                <span className="font-display font-bold">
                  {entry.duration_minutes ? formatTime(entry.duration_minutes * 60) : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

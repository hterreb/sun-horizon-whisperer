
import React from 'react';
import { Clock, Sunrise, Sunset, MapPin } from 'lucide-react';
import { 
  type SunPosition, 
  type SunTimes, 
  type LocationData, 
  type TimeOfDay,
  formatTime,
  getTimeOfDayLabel 
} from '../utils/sunUtils';
import { format } from 'date-fns';

interface InfoPanelProps {
  sunPosition: SunPosition;
  sunTimes: SunTimes | null;
  location: LocationData;
  timeOfDay: TimeOfDay;
  currentTime: Date;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  sunPosition, 
  sunTimes, 
  location, 
  timeOfDay,
  currentTime
}) => {
  if (!sunTimes) return null;

  return (
    <div className="absolute top-0 right-0 p-4 w-[300px] bg-black bg-opacity-40 backdrop-blur-md text-white rounded-bl-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{getTimeOfDayLabel(timeOfDay)}</h1>
        <div className="flex items-center text-sm opacity-80 mt-1">
          <MapPin size={14} className="mr-1" />
          <span>
            {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Clock size={18} className="mr-2" />
            <span className="text-sm">Current Time</span>
          </div>
          <span className="font-semibold">{format(currentTime, 'h:mm:ss a')}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Sunrise size={18} className="mr-2" />
            <span className="text-sm">Sunrise</span>
          </div>
          <span className="font-semibold">{formatTime(sunTimes.sunrise)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Sunset size={18} className="mr-2" />
            <span className="text-sm">Sunset</span>
          </div>
          <span className="font-semibold">{formatTime(sunTimes.sunset)}</span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-white border-opacity-20">
        <h3 className="text-sm font-bold mb-2">Twilight Times</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="font-semibold">Civil</div>
            <div className="opacity-80">{formatTime(sunTimes.dawn)} - {formatTime(sunTimes.dusk)}</div>
          </div>
          <div>
            <div className="font-semibold">Nautical</div>
            <div className="opacity-80">{formatTime(sunTimes.nauticalDawn)} - {formatTime(sunTimes.nauticalDusk)}</div>
          </div>
          <div>
            <div className="font-semibold">Astronomical</div>
            <div className="opacity-80">{formatTime(sunTimes.astronomicalDawn)} - {formatTime(sunTimes.astronomicalDusk)}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-white border-opacity-20">
        <h3 className="text-sm font-bold mb-1">Sun Position</h3>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>
            <span>Altitude: </span>
            <span className="font-mono">{sunPosition.altitude.toFixed(2)}°</span>
          </div>
          <div>
            <span>Azimuth: </span>
            <span className="font-mono">{sunPosition.azimuth.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;

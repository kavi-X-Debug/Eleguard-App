// FILE: hooks/useFirebaseSensors.js
import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebase/config';
import { SENSORS } from '../constants/sensors';

import { useAuth } from './useAuth';

export const useFirebaseSensors = () => {
  const [sensors, setSensors] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSensors({});
      setLoading(false);
      return;
    }

    const sensorsRef = ref(db, 'iot_signals');
    
    const unsubscribe = onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val() || {};
      
      // Inject zone info into sensors
      const processedData = {};
      Object.keys(data).forEach(key => {
        if (SENSORS[key]) {
          processedData[key] = {
            ...data[key],
            zone: SENSORS[key].zone
          };
        }
      });
      
      setSensors(processedData);
      setLoading(false);
    }, (error) => {
      // Suppress permission denied errors if user is null (logout race condition)
      if (error.message?.includes('permission_denied') && !user) return;
      console.error("Firebase realtime db error: ", error);
      setLoading(false);
    });

    return () => off(sensorsRef);
  }, [user]);

  const activeAlerts = Object.values(sensors)
    .filter(s => {
      const isActive = s.isActive === true || s.isActive === "true";
      const isFalseAlarm = s.falseAlarm === true || s.falseAlarm === "true";
      const severity = s.severity?.toString().trim().toUpperCase();
      return isActive && !isFalseAlarm && severity && severity !== 'SAFE';
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { sensors, activeAlerts, loading };
};

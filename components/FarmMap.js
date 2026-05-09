// FILE: components/FarmMap.js
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/colors';
import { SENSORS, GRID_ROWS, GRID_COLS } from '../constants/sensors';
import SensorDot from './SensorDot';

// Build a lookup: { "row-col": sensorId }
const gridLookup = {};
Object.entries(SENSORS).forEach(([id, config]) => {
  gridLookup[`${config.row}-${config.col}`] = id;
});

// Check if cell is in the center farm area (rows 1-3, cols 1-2)
const isFarmCenter = (row, col) => row >= 1 && row <= 3 && col >= 1 && col <= 2;

const CELL_SIZE = 75;
const CELL_MARGIN = 6;

export default function FarmMap({ sensorsData }) {
  const renderGrid = () => {
    const rows = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      const cols = [];

      for (let c = 0; c < GRID_COLS; c++) {
        const key = `${r}-${c}`;
        const sensorId = gridLookup[key];

        if (isFarmCenter(r, c)) {
          // Skip individual cells for center; we render it as a merged block below
          cols.push(<View key={key} style={styles.cellWrapper} />);
          continue;
        }

        if (sensorId) {
          const sensor = sensorsData[sensorId];
          const severity = sensor?.severity?.toString().toUpperCase();
          const isActive = sensor?.isActive === true || sensor?.isActive === "true";
          const isFalseAlarm = sensor?.falseAlarm === true || sensor?.falseAlarm === "true";
          const isAlert = isActive && !isFalseAlarm && (severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM' || severity === 'LOW');
          
          cols.push(
            <View key={key} style={styles.cellWrapper}>
              <SensorDot id={sensorId} sensor={sensor} isAlert={isAlert} />
            </View>
          );
        } else {
          // Empty cell
          cols.push(<View key={key} style={styles.cellWrapper} />);
        }
      }

      rows.push(
        <View key={`row-${r}`} style={styles.row}>
          {cols}
          
          {/* Render the farm center block overlay on row 1 */}
          {r === 1 && (
            <View style={styles.farmCenterContainer}>
              <View style={styles.farmCenter}>
                <Text style={styles.farmEmoji}>🌾</Text>
                <Text style={styles.farmText}>Cultivation</Text>
                <Text style={styles.farmText}>Area</Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return rows;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        {renderGrid()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  mapArea: {
    width: '100%',
    backgroundColor: COLORS.heatmapBg,
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: CELL_MARGIN,
    position: 'relative',
  },
  cellWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: CELL_MARGIN,
  },
  farmCenterContainer: {
    position: 'absolute',
    left: CELL_SIZE + CELL_MARGIN * 2, // skip first col + margins
    width: CELL_SIZE * 2 + CELL_MARGIN * 4,
    top: 0,
    height: CELL_SIZE * 3 + CELL_MARGIN * 4, // 3 rows + gaps
    zIndex: 1,
  },
  farmCenter: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: COLORS.heatmapCellBg,
    borderWidth: 1.5,
    borderColor: COLORS.heatmapCellBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  farmText: {
    color: COLORS.cultivationText,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

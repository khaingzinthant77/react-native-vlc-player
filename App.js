import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { VLCPlayer, VlCPlayerView } from "react-native-vlc-media-player";
import * as ScreenOrientation from "expo-screen-orientation";
const AUTO_HIDE_DELAY = 3000;
const DOUBLE_TAP_DELAY = 300;
export default function App() {
  const hideControlsTimer = useRef(null);
  async function changeScreenOrientation() {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
    );
  }
  const [showControls, setShowControls] = useState(true);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekValue, setSeekValue] = useState(undefined);

  useEffect(() => {
    if (showControls && !paused) {
      startAutoHideTimer();
    } else {
      clearAutoHideTimer();
    }
  }, [showControls, paused]);
  function ControlButton({ label, onPress, big = false }) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.controlBtn, big && styles.controlBtnBig]}
      >
        <Text style={[styles.controlText, big && styles.controlTextBig]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const forward10 = () => {
    seekToSeconds(currentTime + 10);
    showControlsAndResetTimer();
  };

  const backward10 = () => {
    seekToSeconds(currentTime - 10);
    showControlsAndResetTimer();
  };

  const togglePlayPause = () => {
    setPaused((prev) => !prev);
    setShowControls(true);
  };

  const seekToSeconds = (sec) => {
    if (!duration || duration <= 0) return;

    const clamped = Math.max(0, Math.min(sec, duration));
    const fraction = clamped / duration;

    setCurrentTime(clamped);
    setSeekValue(fraction);

    requestAnimationFrame(() => {
      setSeekValue(undefined);
    });
  };

  const showControlsAndResetTimer = () => {
    setShowControls(true);
    if (!paused) {
      startAutoHideTimer();
    }
  };

  const toggleControls = () => {
    setShowControls((prev) => {
      const next = !prev;
      if (next && !paused) {
        startAutoHideTimer();
      } else {
        clearAutoHideTimer();
      }
      return next;
    });
  };
  const startAutoHideTimer = () => {
    clearAutoHideTimer();

    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, AUTO_HIDE_DELAY);
  };

  const clearAutoHideTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  const formatTime = (sec) => {
    if (!Number.isFinite(sec)) return "00:00";

    const total = Math.floor(sec);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
        2,
        "0",
      )}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  return (
    <View style={styles.container}>
      <View style={styles.playerWrapper}>
        <VLCPlayer
          style={styles.video}
          source={{
            // uri: "https://movies.movie4mm.com/2026/Midwinter.Break.2026/Midwinter.Break.2026.1080p.mkv",
            uri: "https://movies.movie4mm.com/2026/Midwinter.Break.2026/Midwinter.Break.2026.1080p.mkv",
          }}
          autoplay={true}
          paused={paused}
          seek={seekValue}
          onLoad={(info) => {
            if (info && typeof info.duration === "number") {
              setDuration(info.duration);
            }
          }}
          onProgress={(progress) => {
            if (typeof progress?.currentTime === "number") {
              setCurrentTime(progress.currentTime);
            }
            if (
              typeof progress?.duration === "number" &&
              progress.duration > 0
            ) {
              setDuration(progress.duration);
            }
          }}
        />

        <Pressable style={styles.tapLayer} onPress={toggleControls} />

        {/* <View style={styles.bottomProgress} pointerEvents="none">
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    duration > 0
                      ? `${Math.min((currentTime / duration) * 100, 100)}%`
                      : "0%",
                },
              ]}
            />
          </View>
        </View> */}

        {showControls && (
          <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.topBar}>
              <Text style={styles.title} numberOfLines={1}>
                Hello
              </Text>
            </View>

            <View style={styles.middleSection} pointerEvents="box-none">
              <View style={styles.centerControls}>
                <ControlButton label="⏪ 10" onPress={backward10} />
                <ControlButton
                  label={paused ? "▶" : "⏸"}
                  onPress={togglePlayPause}
                  big
                />
                <ControlButton label="10 ⏩" onPress={forward10} />
              </View>
            </View>

            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              {/* <View style={styles.progressTrack} /> */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        duration > 0
                          ? `${Math.min((currentTime / duration) * 100, 100)}%`
                          : "0%",
                    },
                  ]}
                />
              </View>

              <Text style={styles.timeText}>{formatTime(duration)}</Text>

              {/* <ControlButton
              label={isFullscreen ? "⤢" : "⛶"}
              onPress={isFullscreen ? exitFullscreen : enterFullscreen}
            /> */}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  playerWrapper: {
    width: "100%",
    height: 300,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  bottomProgress: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },

  topBar: {
    minHeight: 40,
    justifyContent: "center",
  },

  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  middleSection: {
    flex: 1,
    justifyContent: "center",
  },

  centerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  controlBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  controlBtnBig: {
    minWidth: 64,
    minHeight: 64,
  },

  controlText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  controlTextBig: {
    fontSize: 24,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    width: 56,
    textAlign: "center",
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    marginHorizontal: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#e50914",
  },
});

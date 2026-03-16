import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { VLCPlayer } from "react-native-vlc-media-player";
import * as ScreenOrientation from "expo-screen-orientation";

const { width, height } = Dimensions.get("window");
const AUTO_HIDE_DELAY = 3000;
const DOUBLE_TAP_DELAY = 300;

export default function NetflixVlcPlayer({ uri, title = "Video Player" }) {
  const playerRef = useRef(null);
  const hideControlsTimer = useRef(null);
  const lastLeftTap = useRef(0);
  const lastRightTap = useRef(0);

  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekValue, setSeekValue] = useState(undefined);

  const playerHeight = useMemo(() => width * (9 / 16), []);

  useEffect(() => {
    startAutoHideTimer();

    return () => {
      clearAutoHideTimer();
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (showControls && !paused) {
      startAutoHideTimer();
    } else {
      clearAutoHideTimer();
    }
  }, [showControls, paused]);

  const clearAutoHideTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  const startAutoHideTimer = () => {
    clearAutoHideTimer();

    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, AUTO_HIDE_DELAY);
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

  const forward10 = () => {
    seekToSeconds(currentTime + 10);
    showControlsAndResetTimer();
  };

  const backward10 = () => {
    seekToSeconds(currentTime - 10);
    showControlsAndResetTimer();
  };

  const enterFullscreen = async () => {
    try {
      setFullscreen(true);
      await ScreenOrientation.unlockAsync();
    } catch (e) {
      console.log("enterFullscreen error:", e);
    }
  };

  const exitFullscreen = async () => {
    try {
      setFullscreen(false);
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    } catch (e) {
      console.log("exitFullscreen error:", e);
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

  const handleSingleTap = () => {
    toggleControls();
  };

  const handleLeftDoubleTap = () => {
    const now = Date.now();
    if (now - lastLeftTap.current < DOUBLE_TAP_DELAY) {
      backward10();
    }
    lastLeftTap.current = now;
  };

  const handleRightDoubleTap = () => {
    const now = Date.now();
    if (now - lastRightTap.current < DOUBLE_TAP_DELAY) {
      forward10();
    }
    lastRightTap.current = now;
  };

  const PlayerContent = ({ isFullscreen = false }) => {
    return (
      <View
        style={[
          styles.playerWrapper,
          isFullscreen
            ? styles.fullscreenPlayerWrapper
            : { height: playerHeight },
        ]}
      >
        <VLCPlayer
          ref={playerRef}
          style={StyleSheet.absoluteFill}
          source={{ uri }}
          autoplay
          paused={paused}
          seek={seekValue}
          resizeMode="contain"
          autoAspectRatio
          videoAspectRatio="16:9"
          onLoad={(info) => {
            setIsBuffering(false);
            setError(null);

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

            if (
              (typeof progress?.currentTime === "number" &&
                progress.currentTime > 0) ||
              (typeof progress?.duration === "number" && progress.duration > 0)
            ) {
              setIsBuffering(false);
              setError(null);
            }
          }}
          onBuffering={(buffering) => {
            if (typeof buffering?.isBuffering === "boolean") {
              setIsBuffering(buffering.isBuffering);
            }
          }}
          onPlaying={() => {
            setIsBuffering(false);
            setError(null);
          }}
          onPaused={() => {
            setIsBuffering(false);
          }}
          onStopped={() => {
            setIsBuffering(false);
          }}
          onEnded={() => {
            setPaused(true);
            setShowControls(true);
            seekToSeconds(0);
          }}
          onError={(e) => {
            console.log("VLC error:", e);
            setError("Failed to load video.");
            setIsBuffering(false);
          }}
        />

        <Pressable style={styles.singleTapLayer} onPress={handleSingleTap}>
          <View style={styles.doubleTapRow}>
            <Pressable
              style={styles.doubleTapZone}
              onPress={handleLeftDoubleTap}
            />
            <Pressable
              style={styles.doubleTapZone}
              onPress={handleRightDoubleTap}
            />
          </View>
        </Pressable>

        {isBuffering && !error && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {error && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showControls && (
          <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.topBar}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
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

              <ControlButton
                label={isFullscreen ? "⤢" : "⛶"}
                onPress={isFullscreen ? exitFullscreen : enterFullscreen}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={styles.inlineContainer}>
        <PlayerContent />
      </View>

      <Modal
        visible={fullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={exitFullscreen}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <StatusBar hidden />
          <PlayerContent isFullscreen />
        </SafeAreaView>
      </Modal>
    </>
  );
}

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

const styles = StyleSheet.create({
  inlineContainer: {
    width: "100%",
    backgroundColor: "#000",
  },

  playerWrapper: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },

  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  fullscreenPlayerWrapper: {
    width: "100%",
    height: height,
    backgroundColor: "#000",
    justifyContent: "center",
  },

  singleTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  doubleTapRow: {
    flex: 1,
    flexDirection: "row",
  },

  doubleTapZone: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 14,
    paddingVertical: 16,
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

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
  },

  errorText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

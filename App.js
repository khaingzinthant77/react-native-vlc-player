import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import Orientation from "react-native-orientation-locker";
import { VLCPlayer } from "react-native-vlc-media-player";
import * as ScreenOrientation from "expo-screen-orientation";
const HIDE_CONTROLS_DELAY = 3000;

export default function App() {
  const playerRef = useRef(null);
  const hideTimerRef = useRef(null);

  const [paused, setPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [sliderValue, setSliderValue] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [bottomBarWidth, setBottomBarWidth] = useState(0);
  const [rightControlsWidth, setRightControlsWidth] = useState(0);

  const videoUrl =
    "https://movies.movie4mm.com/2026/Midwinter.Break.2026/Midwinter.Break.2026.1080p.mkv";

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const playerHeight = useMemo(() => {
    return isFullscreen ? windowHeight : windowWidth * (9 / 16);
  }, [isFullscreen, windowHeight, windowWidth]);

  const sliderWidth = useMemo(() => {
    const size = isFullscreen ? 170 : 80;
    return Math.max(0, bottomBarWidth - rightControlsWidth - size);
  }, [bottomBarWidth, rightControlsWidth]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startHideTimer = useCallback(() => {
    clearHideTimer();

    if (!paused && showControls) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, HIDE_CONTROLS_DELAY);
    }
  }, [clearHideTimer, paused, showControls]);

  useEffect(() => {
    startHideTimer();
    return clearHideTimer;
  }, [showControls, paused, startHideTimer, clearHideTimer]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      Orientation.lockToPortrait();
    };
  }, [clearHideTimer]);

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "00:00";

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0",
      )}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const showControlsAndRestartTimer = useCallback(() => {
    setShowControls(true);
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, HIDE_CONTROLS_DELAY);
  }, [clearHideTimer]);

  const toggleControls = () => {
    if (showControls) {
      clearHideTimer();
      setShowControls(false);
    } else {
      showControlsAndRestartTimer();
    }
  };

  const togglePlayPause = () => {
    setPaused((prev) => !prev);
    showControlsAndRestartTimer();
  };

  const seekTo = (seconds) => {
    if (!playerRef.current || !duration) return;

    let safeSeconds = seconds;
    if (safeSeconds < 0) safeSeconds = 0;
    if (safeSeconds > duration) safeSeconds = duration;

    const position = safeSeconds / duration;

    try {
      playerRef.current.seek(position);
      setCurrentTime(safeSeconds);
      setSliderValue(position);
    } catch (err) {
      console.log("Seek error:", err);
    }
  };

  const seekBackward = () => {
    seekTo(currentTime - 10);
    showControlsAndRestartTimer();
  };

  const seekForward = () => {
    seekTo(currentTime + 10);
    showControlsAndRestartTimer();
  };

  // const enterFullscreen = () => {
  //   setIsFullscreen(true);
  //   Orientation.lockToLandscape();
  //   showControlsAndRestartTimer();
  // };
  async function enterFullscreen() {
    try {
      setIsFullscreen(true);
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
      );
    } catch (error) {
      console.log("Enter fullscreen error:", error);
    }
  }

  const exitFullscreen = async () => {
    setIsFullscreen(false);

    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    } catch (e) {
      console.log("PORTRAIT_UP not supported, unlocking instead", e);
      await ScreenOrientation.unlockAsync();
    }

    showControlsAndRestartTimer();
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const handleProgress = (progress) => {
    const newCurrentTime = Number(progress?.currentTime ?? 0);
    const newDuration = Number(progress?.duration ?? duration ?? 0);

    let newPosition = 0;
    if (typeof progress?.position === "number") {
      newPosition = progress.position;
    } else if (newDuration > 0) {
      newPosition = newCurrentTime / newDuration;
    }

    if (newDuration > 0) {
      setDuration(newDuration);
    }

    if (!isSliding) {
      setCurrentTime(newCurrentTime);
      setSliderValue(newPosition);
    }

    if (newCurrentTime > 0) {
      setIsBuffering(false);
      setError("");
    }
  };

  const handleLoad = (data) => {
    const loadedDuration = Number(data?.duration ?? 0);
    if (loadedDuration > 0) {
      setDuration(loadedDuration);
    }
    setIsBuffering(false);
    setError("");
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setError("");
  };

  const handleBuffering = () => {
    setIsBuffering(true);
  };

  const handlePaused = () => {
    setIsBuffering(false);
  };

  const handleEnded = () => {
    setPaused(true);
    setCurrentTime(duration);
    setSliderValue(1);
    setShowControls(true);
    clearHideTimer();
  };

  const handleError = (e) => {
    console.log("VLC Error:", e);
    setError("Video failed to play.");
    setIsBuffering(false);
    setShowControls(true);
    clearHideTimer();
  };

  const previewTime = isSliding ? sliderValue * duration : currentTime;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={isFullscreen} barStyle="light-content" />

      <View
        style={[
          styles.playerContainer,
          {
            width: isFullscreen ? windowWidth : "100%",
            height: playerHeight,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.touchArea}>
            <VLCPlayer
              ref={playerRef}
              style={styles.player}
              source={{
                uri: videoUrl,
                initType: 1,
                hwDecoderEnabled: 1,
                hwDecoderForced: 1,
                initOptions: [
                  "--network-caching=150",
                  "--rtsp-tcp",
                  "--no-stats",
                ],
              }}
              autoplay={true}
              paused={paused}
              resizeMode="contain"
              autoAspectRatio={true}
              onLoad={handleLoad}
              onProgress={handleProgress}
              onPlaying={handlePlaying}
              onBuffering={handleBuffering}
              onPaused={handlePaused}
              onEnded={handleEnded}
              onError={handleError}
              repeat={true}
            />

            {isBuffering && (
              <View style={styles.loadingLayer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {showControls && (
              <View style={styles.overlay}>
                <View style={styles.topBar}>
                  <Text style={styles.videoTitle}>My VLC Video</Text>
                  <TouchableOpacity
                    onPress={toggleFullscreen}
                    style={styles.topButton}
                  >
                    <Text style={styles.topButtonText}>
                      {isFullscreen ? "Exit" : "Full"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.middleControls}>
                  <TouchableOpacity
                    style={styles.sideControl}
                    onPress={seekBackward}
                  >
                    <Text style={styles.sideControlText}>⏪</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={togglePlayPause}
                  >
                    <Text style={styles.playButtonText}>
                      {paused ? "▶" : "⏸"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sideControl}
                    onPress={seekForward}
                  >
                    <Text style={styles.sideControlText}>⏩</Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={styles.bottomBar}
                  onLayout={(e) =>
                    setBottomBarWidth(e.nativeEvent.layout.width)
                  }
                >
                  <Text style={styles.timeText}>{formatTime(previewTime)}</Text>

                  <Slider
                    style={[styles.slider, { width: sliderWidth, flex: 0 }]}
                    minimumValue={0}
                    maximumValue={1}
                    value={sliderValue}
                    minimumTrackTintColor="#e50914"
                    maximumTrackTintColor="rgba(255,255,255,0.35)"
                    thumbTintColor="#e50914"
                    onSlidingStart={() => {
                      setIsSliding(true);
                      clearHideTimer();
                      setShowControls(true);
                    }}
                    onValueChange={(value) => {
                      setSliderValue(value);
                    }}
                    onSlidingComplete={(value) => {
                      setIsSliding(false);
                      setSliderValue(value);
                      seekTo(value * duration);
                      showControlsAndRestartTimer();
                    }}
                  />

                  <View
                    style={styles.rightControls}
                    onLayout={(e) =>
                      setRightControlsWidth(e.nativeEvent.layout.width)
                    }
                  >
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>

                    <TouchableOpacity
                      onPress={toggleFullscreen}
                      style={styles.fullscreenButton}
                    >
                      <Text style={styles.fullscreenText}>
                        {isFullscreen ? "⤢" : "⛶"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>

      {!isFullscreen && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Netflix Style VLC Player</Text>
          <Text style={styles.infoSubtitle}>
            Auto hide controls + rotate + fullscreen
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  playerContainer: {
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  touchArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  player: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(229,9,20,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.30)",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
  },
  topBar: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  videoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  topButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
  },
  topButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  middleControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  sideControl: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 76,
    alignItems: "center",
  },
  sideControlText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  playButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.20)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  slider: {
    marginHorizontal: 6,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    minWidth: 50,
  },
  fullscreenButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  fullscreenText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  infoSection: {
    padding: 16,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoSubtitle: {
    color: "#b3b3b3",
    fontSize: 14,
  },
});

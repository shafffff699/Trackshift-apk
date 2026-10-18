extends Node

var player: AudioStreamPlayer
var playback: AudioStreamGeneratorPlayback
var sample_rate := 22050.0
var tone_freq := 0.0
var tone_timer := 0.0

func _ready() -> void:
	player = AudioStreamPlayer.new()
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = sample_rate
	gen.buffer_length = 0.1
	player.stream = gen
	add_child(player)
	player.play()
	playback = player.get_stream_playback()

func _process(delta: float) -> void:
	if tone_timer > 0.0:
		tone_timer -= delta
		_fill_buffer(tone_freq)
	else:
		_fill_buffer(0.0)

func _fill_buffer(freq: float) -> void:
	if playback == null:
		return
	var frames := playback.get_frames_available()
	var phase := 0.0
	var increment := freq / sample_rate
	for i in range(frames):
		if freq > 0.0 and SaveManager.data.get("sound_enabled", true):
			var sample := sin(phase * TAU) * 0.18
			playback.push_frame(Vector2(sample, sample))
			phase = fmod(phase + increment, 1.0)
		else:
			playback.push_frame(Vector2.ZERO)

func play_coin() -> void:
	tone_freq = 987.77
	tone_timer = 0.09

func play_jump() -> void:
	tone_freq = 440.0
	tone_timer = 0.12

func play_slide() -> void:
	tone_freq = 220.0
	tone_timer = 0.11

func play_powerup() -> void:
	tone_freq = 783.99
	tone_timer = 0.22

func play_crash() -> void:
	tone_freq = 110.0
	tone_timer = 0.35

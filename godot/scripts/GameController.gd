extends Node3D

const LANE_WIDTH := 2.6
const GRAVITY := 38.0
const BASE_JUMP_VEL := 14.2
const BOOTS_JUMP_VEL := 18.6

enum State { TITLE, PLAYING, PAUSED, GAMEOVER }

var state: State = State.TITLE
var current_lane: int = 0
var player_x: float = 0.0
var player_y: float = 0.0
var player_vy: float = 0.0
var is_sliding: bool = false
var slide_timer: float = 0.0

var distance: float = 0.0
var score: float = 0.0
var run_coins: int = 0
var speed: float = 18.0

var vortex_timer: float = 0.0
var boots_timer: float = 0.0
var glider_timer: float = 0.0
var aegis_timer: float = 0.0

var swipe_start: Vector2 = Vector2.ZERO
var is_swiping: bool = false

@onready var camera: Camera3D = $Camera3D
@onready var courier_node: Node3D = $Courier
@onready var hud_label: Label = $CanvasLayer/HudPanel/StatsLabel
@onready var state_panel: Panel = $CanvasLayer/MenuPanel
@onready var start_btn: Button = $CanvasLayer/MenuPanel/StartButton

func _ready() -> void:
	start_btn.pressed.connect(_on_start_pressed)
	_update_ui()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if state == State.PLAYING:
			state = State.PAUSED
			_update_ui()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			swipe_start = event.position
			is_swiping = true
		else:
			is_swiping = false
	elif event is InputEventScreenDrag and is_swiping and state == State.PLAYING:
		var delta_vec: Vector2 = event.position - swipe_start
		var sens: float = float(SaveManager.data.get("swipe_sensitivity", 1.0))
		var threshold: float = 42.0 / sens
		if delta_vec.length() >= threshold:
			is_swiping = false
			if abs(delta_vec.x) > abs(delta_vec.y):
				_switch_lane(1 if delta_vec.x > 0 else -1)
			else:
				if delta_vec.y < 0:
					_jump()
				else:
					_slide()
	elif event is InputEventKey and event.pressed and not event.echo:
		if state == State.PLAYING:
			if event.keycode in [KEY_LEFT, KEY_A]:
				_switch_lane(-1)
			elif event.keycode in [KEY_RIGHT, KEY_D]:
				_switch_lane(1)
			elif event.keycode in [KEY_UP, KEY_W, KEY_SPACE]:
				_jump()
			elif event.keycode in [KEY_DOWN, KEY_S]:
				_slide()
			elif event.keycode in [KEY_ESCAPE, KEY_P]:
				state = State.PAUSED
				_update_ui()

func _switch_lane(delta_lane: int) -> void:
	current_lane = clampi(current_lane + delta_lane, -1, 1)

func _jump() -> void:
	if player_y <= 0.05 and glider_timer <= 0.0:
		player_vy = BOOTS_JUMP_VEL if boots_timer > 0.0 else BASE_JUMP_VEL
		is_sliding = false
		AudioManager.play_jump()

func _slide() -> void:
	is_sliding = true
	slide_timer = 0.62
	if player_y > 0.05:
		player_vy = minf(player_vy, -24.0)
	AudioManager.play_slide()

func _process(delta: float) -> void:
	if state != State.PLAYING:
		return

	var dt := minf(delta, 0.05)
	speed = minf(42.0, 18.0 + distance * 0.011)
	var dist_step := speed * dt
	distance += dist_step
	score += dist_step * 10.0 * float(SaveManager.data.get("mission_level", 1))

	player_x = lerpf(player_x, float(current_lane) * LANE_WIDTH, minf(1.0, dt * 16.0))

	if glider_timer > 0.0:
		glider_timer = maxf(0.0, glider_timer - dt)
		player_y = lerpf(player_y, 6.2, minf(1.0, dt * 10.0))
		player_vy = 0.0
	else:
		if player_y > 0.0 or player_vy > 0.0:
			player_y += player_vy * dt
			player_vy -= GRAVITY * dt
			if player_y <= 0.0:
				player_y = 0.0
				player_vy = 0.0

	if is_sliding:
		slide_timer -= dt
		if slide_timer <= 0.0:
			is_sliding = false

	vortex_timer = maxf(0.0, vortex_timer - dt)
	boots_timer = maxf(0.0, boots_timer - dt)
	aegis_timer = maxf(0.0, aegis_timer - dt)

	courier_node.position = Vector3(player_x, player_y, 0.0)
	camera.position = camera.position.lerp(Vector3(player_x * 0.6, 3.9 + player_y * 0.6, 6.5), minf(1.0, dt * 12.0))
	_update_ui()

func _on_start_pressed() -> void:
	distance = 0.0
	score = 0.0
	run_coins = 0
	current_lane = 0
	player_x = 0.0
	player_y = 0.0
	player_vy = 0.0
	state = State.PLAYING
	_update_ui()

func _update_ui() -> void:
	state_panel.visible = (state != State.PLAYING)
	hud_label.text = "SCORE: %d   DIST: %dm   COINS: %d" % [int(score), int(distance), run_coins]

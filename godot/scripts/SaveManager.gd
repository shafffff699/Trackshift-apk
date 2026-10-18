extends Node

const SAVE_PATH := "user://trackshift_save.json"

var data: Dictionary = {
	"high_score": 0,
	"coins": 250,
	"tokens": 1,
	"total_distance": 0,
	"total_runs": 0,
	"mission_level": 1,
	"unlocked_characters": ["kairo_cyan"],
	"selected_character": "kairo_cyan",
	"unlocked_boards": ["ion_board"],
	"selected_board": "ion_board",
	"sound_enabled": true,
	"music_enabled": true,
	"graphics_quality": "high",
	"reduced_motion": false,
	"swipe_sensitivity": 1.0
}

func _ready() -> void:
	load_game()

func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		save_game()
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var content := file.get_as_text()
	file.close()
	var parsed = JSON.parse_string(content)
	if typeof(parsed) == TYPE_DICTIONARY:
		for k in parsed.keys():
			data[k] = parsed[k]

func save_game() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(data, "\t"))
	file.close()

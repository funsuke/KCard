// *************************************************************
// エンティティクラス
// *************************************************************

// アセットID
interface AssetIDs {
	[key: string]: string;
}

// エンティティ
export class CEntity {
	// アセットID
	private static imageAssetIDs: AssetIDs = {
		back: "nc276354", // 背景緑
		card: "card",			// Kカード
		hand: "hand",			// 手
		select: "select",		// 「どちらかを選んでください」
		pointer: "pointer",	// 指
		player: "guest",		// 「現在の参加者」
		playerNum: "mei",			// 「名」
		dial: "watch1",		// 時計：ダイアル、文字盤
		second: "watch2",		// 時計：針
		bezel: "watch3",		// 時計：ベゼル、ベルト
	};
	private static audioAssetIDs: AssetIDs = {
		second: "nc276174",	// 針
		heart: "nc164764",	// 心臓
		leave: "nc314547",	// 退場
		select: "nc41227",	// 選択
	};
	// フォントアセット
	private static blackFont: g.DynamicFont;
	private static whiteFont: g.DynamicFont;
	private static orangeRedFont: g.DynamicFont;

	// 秒用フォント
	private static createBlackFont(): g.DynamicFont {
		return new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 96,
			fontColor: "black",
			strokeColor: "white",
			strokeWidth: 8,
		});
	}

	// 〇票で選択されましたフォント
	private static createWhiteFont(): g.DynamicFont {
		return new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 96,
			fontColor: "white",
			strokeColor: "black",
			strokeWidth: 8,
		});
	}

	// 参加人数数フォント
	private static createOrangeRedFont(): g.DynamicFont {
		return new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 96,
			fontColor: "orangered",
			strokeColor: "black",
			strokeWidth: 8,
		});
	}

	// フォント設定
	public static createFonts(): void {
		// 黒文字白袋
		this.blackFont = this.createBlackFont();
		// 白文字黒袋
		this.whiteFont = this.createWhiteFont();
		// オレンジ文字黒袋
		this.orangeRedFont = this.createOrangeRedFont();
	}

	// 画像アセットIDの文字列を取得
	public static getImageAssetIDs(): string[] {
		// return Object.values(this.ImageAssetIDs)		// ES2017
		const str: string[] = [];
		for (const key in this.imageAssetIDs) {
			if (Object.prototype.hasOwnProperty.call(this.imageAssetIDs, key)) {
				str.push(this.imageAssetIDs[key]);
			}
		}
		return str;
	}

	// 効果音/BGMアセットIDの文字列を取得
	public static getAudioAssetIDs(): string[] {
		const str: string[] = [];
		for (const key in this.audioAssetIDs) {
			if (Object.prototype.hasOwnProperty.call(this.audioAssetIDs, key)) {
				str.push(this.audioAssetIDs[key]);
			}
		}
		return str;
	}

	// 背景緑
	public static createBack(_scene: g.Scene): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.back),
		});
	}

	// 「どちらかを選んでください」
	public static createSelect(_scene: g.Scene): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.select),
			anchorX: 0.5,
			x: g.game.width / 2,
			y: 16,
		});
	}

	// 「名」
	public static createPlayerNum(_scene: g.Scene): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.playerNum),
			anchorX: 1.0,
			anchorY: 1.0,
			x: - 32,
			y: - 18,
		});
	}

	// 「現在の参加者」
	public static createPlayer(_scene: g.Scene): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.player),
			anchorX: 1.0,
			anchorY: 1.0,
			x: - 32 - 80 - 54 * 1,
			y: - 18,
		});
	}

	// 時計：ダイアル
	public static createDial(_scene: g.Scene, _x: number, _y: number): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.dial),
			anchorX: 0.5,
			anchorY: 0.5,
			x: _x,
			y: _y,
			angle: -10,
		});
	}

	// 時計：秒針
	public static createSecond(_scene: g.Scene, _x: number, _y: number): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.second),
			anchorX: 0.5,
			anchorY: 0.5,
			x: _x,
			y: _y,
			angle: -10,
		});
	}

	// 時計：ベゼル
	public static createBezel(_scene: g.Scene, _x: number, _y: number): g.Sprite {
		return new g.Sprite({
			scene: _scene,
			src: _scene.asset.getImageById(this.imageAssetIDs.bezel),
			anchorX: 0.5,
			anchorY: 0.5,
			x: _x,
			y: _y,
			angle: -10,
		});
	}

	// 秒針の音
	public static createSndSecond(_scene: g.Scene): g.AudioAsset {
		return _scene.asset.getAudioById(this.audioAssetIDs.second);
	}

	// 退場の音
	public static createSndLeave(_scene: g.Scene): g.AudioAsset {
		return _scene.asset.getAudioById(this.audioAssetIDs.leave);
	}

	// 選択の音
	public static createSndSelect(_scene: g.Scene): g.AudioAsset {
		return _scene.asset.getAudioById(this.audioAssetIDs.select);
	}

	// 参加人数ラベル
	public static createLblPlayerNum(_scene: g.Scene, _playerNum: number): g.Label {
		return new g.Label({
			scene: _scene,
			font: this.orangeRedFont,
			fontSize: 105,
			text: " " + _playerNum.toString(),
			textAlign: "right",
			width: 32 * 1,
			anchorX: 1.0,
			anchorY: 1.0,
			x: - 32 - 80,
			y: - 20,
		});
	}

	// 秒数ラベル
	public static createLblSecond(_scene: g.Scene, _width: number, _y: number): g.Label {
		return new g.Label({
			scene: _scene,
			font: this.blackFont,
			fontSize: 150,
			text: "",
			width: _width,	// count.width,
			anchorY: 1.0,
			x: -10,
			y: _y,	// timer.height - 78,
		});
	}

	// 投票人数ラベル
	public static createLblVoteNum(_scene: g.Scene, _text: string, _width: number, _y: number): g.Label {
		return new g.Label({
			scene: _scene,
			font: this.blackFont,
			fontSize: 64,
			text: _text,	// `${selectNum[i]}人`,
			textAlign: "center",
			width: _width,	// card[i].width * card[i].scaleX,
			anchorX: 0.5,
			y: _y,	// card[i].height * card[i].scaleY / 2,
		});
	}

	// 当選した人数ラベル
	public static createLblWinningNum(_scene: g.Scene): g.Label {
		return new g.Label({
			scene: _scene,
			font: this.whiteFont,
			text: "",
			textAlign: "center",
			anchorX: 0.5,
			anchorY: 0.5,
			x: g.game.width / 2,
			y: g.game.height / 2,
			hidden: true,
		});
	}
}

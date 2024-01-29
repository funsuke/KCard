// akashic init -t typescript
// npm install -DE @akashic/akashic-engine
// akashic serve -s nicolive

// 1. (4, 2)に入れて(5, 2)になりました
//   1-1. リロード(5, 2)で5に入れて何も変わらなかった
//     1-1-1. (5, 2)で2に入れて(4, 3)になりました ok
//   1-2. リロード(5, 2)で2に入れて何も変わらなかった -> (4, 3)に変わって欲しい
//     1-2-1. (5, 2)で5に入れて(6, 1)になりました NG 総数は変わらんが1票操作
// 2. (5, 1)に入れて(5, 2)になりました
//   2-1. リロード(5, 2)で5に入れて何も変わらなかった -> (6, 1)に変わって欲しい
//     2-1-1. (5, 2)で2に入れて(4, 3)になりました NG 同上
//   2-2. リロード(5, 2)で2に入れて何も変わらなかった
//     2-2-1. (5, 2)で5に入れて(6, 1)になりました ok

// 配信者名デフォルト：くりた＋ランダム数値
// 視聴者名：市民＋通し番号（表示させる） 初投票時に名前付け
// 勝利数が多いプレイヤーが多く選んだ方を文字などで表示
// 視聴者側が勝った場合、煽りコメントボタン各種
// 個人成績用ポイント：負け0、引き分け1、勝利2

import { Easing, Timeline } from "@akashic-extension/akashic-timeline";
import { CEntity } from "./CEntity";

interface Vote {
	[index: string]: number;
}

const GameState = {
	Waiting: "waiting",
	Title: "title",
	GameInit: "gameInit",
	Game: "game",
	Moving: "moving",
	ResultInit: "resultInit",
	Result: "result",
} as const;
type GameState = typeof GameState[keyof typeof GameState];

enum CardType {
	none = 0,
	back = 1,
	emperor = 2,
	citizen = 3,
	slave = 4,
};

// *************************************************************
// メイン関数
function main(): void {
	// シーンの設定
	const scene = new g.Scene({
		game: g.game,
		assetIds: [
			...CEntity.getImageAssetIDs(),
			...CEntity.getAudioAssetIDs(),
		],
	});

	// フォント
	CEntity.createFonts();

	// ゲームステータス
	let gameStatus: GameState = GameState.Waiting;
	// 配信者
	let gameMasterId: null | string = null;
	const masterVote: Vote = {};
	// 参加人数(リスナー)
	const guestVotes: Vote = {};
	// 選択した人数(リスナー用)
	const selectNum: number[] = [0, 0];

	// タイムライン
	const tl = new Timeline(scene);

	// =============================================================
	// ジョイン時処理
	g.game.onJoin.addOnce((ev: g.JoinEvent) => {
		gameMasterId = (ev.player.id != null) ? ev.player.id : null;
	});

	// =============================================================
	// シーン読込時処理
	scene.onLoad.add(() => {
		// -------------------------------------------------------------
		// 音アセット
		// -------------------------------------------------------------
		// 秒針チクタク音
		const tickAudioPlayer: g.AudioPlayer = CEntity.createSndSecond(scene).play();
		// 画像などがはける音(風切り音)
		const exit: g.AudioAsset = CEntity.createSndLeave(scene);
		// カード選択音
		const audSelect: g.AudioAsset = CEntity.createSndSelect(scene);

		// -------------------------------------------------------------
		// 画像エンティティ
		// -------------------------------------------------------------
		// 背景
		scene.append(CEntity.createBack(scene));
		// 選んで！
		const select = CEntity.createSelect(scene);
		scene.append(select);

		// -------------------------------------------------------------
		// 参加人数関連
		// -------------------------------------------------------------
		const entGuestNum = new g.E({
			scene,
			anchorX: 1.0, anchorY: 1.0,
			x: g.game.width, y: g.game.height,
			hidden: true,
			local: true,
		});
		// 「名」
		entGuestNum.append(CEntity.createPlayerNum(scene));
		// 数値
		const lblPlayerNum = CEntity.createLblPlayerNum(scene, Object.keys(guestVotes).length);
		entGuestNum.append(lblPlayerNum);
		// 「現在の参加者」
		const sprGuest = CEntity.createPlayer(scene);
		entGuestNum.append(sprGuest);
		//
		scene.append(entGuestNum);	// join処理後マスターのみ追加

		// -------------------------------------------------------------
		// 時計関連
		// -------------------------------------------------------------
		const watch = new g.Pane({
			scene: scene, width: 400, height: 600,
			anchorX: 0.5,
			anchorY: 0.5,
			x: 150,
			y: g.game.height - 180,
		});
		const watchCX: number = watch.width / 2;
		const watchCY: number = watch.height / 2;
		// 時計盤
		const count = CEntity.createDial(scene, watchCX, watchCY);
		watch.append(count);
		// 秒針
		const seconds = CEntity.createSecond(scene, watchCX, watchCY);
		watch.append(seconds);
		// ケースやベルト
		const caseBelt = CEntity.createBezel(scene, watchCX, watchCY);
		watch.append(caseBelt);
		// 秒数ラベル
		const lblSecond = CEntity.createLblSecond(scene, count.width, watch.height - 78);
		lblSecond.onUpdate.add(() => {
			lblSecond.text = " " + Math.ceil((370 + seconds.angle) / 6);
			lblSecond.invalidate();
		});
		watch.append(lblSecond);
		//
		// watch.angle = -10;
		watch.scale(0.7);
		scene.append(watch);

		// -------------------------------------------------------------
		// カード関連
		// -------------------------------------------------------------
		const entCard: g.E[] = new Array<g.E>(2);
		for (let i = 0; i < entCard.length; i++) {
			entCard[i] = new g.E({
				scene: scene,
				anchorX: 0.5,
				anchorY: 0.5,
				x: g.game.width / 2 - 200 + 400 * i,
				y: g.game.height / 2 - 20,
			});
		}
		// カード
		const card: g.FrameSprite[] = new Array<g.FrameSprite>(2);
		for (let i = 0; i < entCard.length; i++) {
			// エンティティ
			card[i] = new g.FrameSprite({
				scene: scene,
				src: scene.asset.getImageById("card"),
				width: 200,
				height: 300,
				frames: [0, 1, 2, 3, 4, 5],
				frameNumber: CardType.citizen,
				hidden: true,
				anchorX: 0.5,
				anchorY: 0.5,
				scaleX: 1.25,
				scaleY: 1.25,
				angle: -5 + 10 * i,
				local: true,
				touchable: true,
			});
			entCard[i].append(card[i]);
			// イベント
			card[i].onPointDown.add((ev: g.PointDownEvent) => {
				// 終了処理
				if (gameStatus !== GameState.Game) return;
				if (ev.player == null) return;			// プレイヤープロパティが取得できない場合終了
				if (ev.player.id == null) return;		// プレイヤーIDが取得できない場合終了
				// (選択した)カードのポインターを表示切替
				const unselIdx: number = 1 - i;
				cardPointer[i].show();
				cardPointer[unselIdx].hide();
				// (非選択した)カードに影を落とす
				cardShadow[unselIdx].show();
				cardShadow[i].hide();
				// 選択音の再生
				audSelect.play().changeVolume(0.5);
				// ロール毎の処理
				const playerId: string = ev.player.id;
				// if (playerId !== gameMasterId) {
				// 	// 投票したことがあるか調べる
				// 	if (playerId in guestVotes) {
				// 		if (guestVotes.playerId === i) return;	// 前回と同じ場合終了
				// 		// 前回とは違う投票なので更新してRaiseEventを発生させる
				// 		// guestVotes.playerId = i;
				// 		if (i === 0) {
				// 			// selectNum[0]++;
				// 			// selectNum[1]--;
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "Selected0" }));
				// 		} else {
				// 			// selectNum[1]++;
				// 			// selectNum[0]--;
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "Selected1" }));
				// 		}
				// 	} else {
				// 		// 初回投票なので追加してRaiseEventを発生させる
				// 		// guestVotes[playerId] = i;
				// 		if (i === 0) {
				// 			// selectNum[0]++;
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected0" }));
				// 		} else {
				// 			// selectNum[1]++;
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected1" }));
				// 		}
				// 	}
				// } else {
				// 	// 投票したことがあるか調べる
				// 	if (playerId in masterVote) {
				// 		if (masterVote.playerId === i) return;	// 前回と同じ場合終了
				// 		// masterVote.playerId = i;			// 前回とは違うので更新
				// 		if (i === 0) {
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "Selected0" }));
				// 		} else {
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "Selected1" }));
				// 		}
				// 	} else {
				// 		// masterVote[playerId] = i;			// 初回投票なので追加
				// 		if (i === 0) {
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected0" }));
				// 		} else {
				// 			g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected1" }));
				// 		}
				// 	}
				// }
				// 既に登録されている場合
				if (playerId in masterVote || playerId in guestVotes) {
					// 前回と同じ選択の場合終了
					if (playerId in masterVote && masterVote[playerId] === i) return;
					if (playerId in guestVotes && guestVotes[playerId] === i) return;
					// 前回片方に投票済み
					if (i === 0) {
						g.game.raiseEvent(new g.MessageEvent({ message: "Selected0" }));
					} else {
						g.game.raiseEvent(new g.MessageEvent({ message: "Selected1" }));
					}
				} else {
					// 初回投票
					if (i === 0) {
						g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected0" }));
					} else {
						g.game.raiseEvent(new g.MessageEvent({ message: "FirstSelected1" }));
					}
				}
			});
		}
		// 非選択用の影
		const cardShadow: g.Sprite[] = new Array<g.Sprite>(2);
		for (let i = 0; i < entCard.length; i++) {
			cardShadow[i] = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById("card"),
				srcX: 1000,
				srcY: 0,
				srcWidth: 200,
				srcHeight: 300,
				width: 200,
				height: 300,
				hidden: true,
				anchorX: 0.5,
				anchorY: 0.5,
				scaleX: 1.25,
				scaleY: 1.25,
				angle: -5 + 10 * i,
			});
			entCard[i].append(cardShadow[i]);
		}
		// カード選択時のポインター
		const cardPointer: g.Sprite[] = new Array<g.Sprite>(2);
		for (let i = 0; i < entCard.length; i++) {
			// エンティティ
			cardPointer[i] = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById("pointer"),
				anchorX: 0.5,
				anchorY: 0.5,
				y: -card[i].height * card[i].scaleY / 2,
				local: true,
			});
			entCard[i].append(cardPointer[i]);
			// イベント
			cardPointer[i].onUpdate.add(() => {
				cardPointer[i].y += 1.5;
				if (cardPointer[i].y >= -card[i].height * card[i].scaleY / 2 + 30) {
					cardPointer[i].y = -card[i].height * card[i].scaleY / 2;
				}
				cardPointer[i].modified();
			});
		}
		// const cardFrame: g.Pane[] = new Array<g.Pane>(2);
		// for (let i = 0; i < 2; i++) {
		// 	cardFrame[i] = new g.Pane({
		// 		scene: scene,
		// 		width: card[i].width * card[i].scaleX + 20,
		// 		height: card[i].height * card[i].scaleY + 20,
		// 		hidden: true,
		// 		anchorX: 0.5,
		// 		anchorY: 0.5,
		// 	});
		// 	const rect1 = new g.FilledRect({
		// 		scene: scene,
		// 		cssColor: "red",
		// 		width: cardFrame[i].width,
		// 		height: cardFrame[i].height,
		// 	});
		// 	cardFrame[i].append(rect1);
		// 	const rect2 = new g.FilledRect({
		// 		scene: scene,
		// 		cssColor: "black",
		// 		width: card[i].width * card[i].scaleX - 20,
		// 		height: card[i].height * card[i].scaleY - 20,
		// 		compositeOperation: "xor",
		// 		x: 20,
		// 		y: 20,
		// 	});
		// 	cardFrame[i].append(rect2);
		// 	entCard[i].append(cardFrame[i]);
		// }
		// カード選択情報
		const lblVoteNum: g.Label[] = new Array<g.Label>(2);
		for (let i = 0; i < card.length; i++) {
			lblVoteNum[i] = CEntity.createLblVoteNum(
				scene, `${selectNum[i]}人`, card[i].width * card[i].scaleX, card[i].height * card[i].scaleY / 2);
			entCard[i].append(lblVoteNum[i]);
		}
		// カードエンティティ類をappend
		for (let i = 0; i < entCard.length; i++) {
			scene.append(entCard[i]);
		}

		// 〇票で選択されました
		const lblWinningNum = CEntity.createLblWinningNum(scene);
		scene.append(lblWinningNum);


		// 手
		// const hand = new g.Sprite({
		// 	scene: scene,
		// 	src: scene.asset.getImageById("hand"),
		// 	anchorX: 0.5,
		// 	anchorY: 0.5,
		// 	x: g.game.width / 2,
		// });
		// scene.append(hand);

		// =============================================================
		// ラベルの更新
		function redrawLabels(selIdx: number): void {
			const unselIdx: number = 1 - selIdx;
			const lblSelected: g.Label = lblVoteNum[selIdx];
			const lblUnselected: g.Label = lblVoteNum[unselIdx];
			// 人数の更新
			lblSelected.text = ` ${selectNum[selIdx]}人 `;
			lblSelected.invalidate();
			lblUnselected.text = ` ${selectNum[unselIdx]}人 `;
			lblUnselected.invalidate();
			// // 割合の更新
			// const sum = selectNum[selIdx] + selectNum[unselIdx];
			// if (sum !== 0) {
			// 	lblSelected[1].text = `${(selectNum[selIdx] / sum * 100).toFixed(2)}％`;
			// 	lblSelected[1].invalidate();
			// 	lblUnselected[1].text = `${(selectNum[unselIdx] / sum * 100).toFixed(2)}％`;
			// 	lblUnselected[1].invalidate();
			// }
			// マスターに表示される参加者数関連
			const strGuestNum: string = Object.keys(guestVotes).length.toString();
			const guestDigitNum: number = strGuestNum.length;
			lblPlayerNum.width = 32 * guestDigitNum;
			lblPlayerNum.text = ` ${strGuestNum} `;
			lblPlayerNum.invalidate();
			sprGuest.x = - 32 - 80 - 52 * guestDigitNum;
			sprGuest.modified();
		}

		// =============================================================
		// リロード時などの表示バグを修正する
		function controlDisplayBug(): void {
			// 脱出処理
			if (gameStatus !== GameState.Game) return;
			if (g.game.selfId == null) return;
			// 既に参加していた場合
			// if (g.game.selfId in masterVote || g.game.selfId in guestVotes) {
			// 	// ポインタが２つ表示されている場合
			// 	if (cardPointer[0].visible() && cardPointer[1].visible()) {
			// 		let selectedIdx: number | null = null;
			// 		if (g.game.selfId in masterVote) {
			// 			selectedIdx = masterVote[g.game.selfId];
			// 		} else if (g.game.selfId in guestVotes) {
			// 			selectedIdx = guestVotes[g.game.selfId];
			// 		}
			// 		if (selectedIdx != null) {
			// 			cardPointer[selectedIdx].show();
			// 			cardPointer[1 - selectedIdx].hide();
			// 			cardShadow[selectedIdx].hide();
			// 			cardShadow[1 - selectedIdx].show();
			// 		}
			// 	}
			// }
		}

		// =============================================================
		// join後に一度だけ実行
		function onGameMasterArrive(): void {
			//
			if (g.game.selfId === gameMasterId) {
				card[0].frameNumber = CardType.emperor;
				lblVoteNum[0].hide();
				lblVoteNum[1].hide();
				entGuestNum.show();
			} else {
				card[0].frameNumber = CardType.slave;
				// for (let i = 0; i < card.length; i++) {
				// 	labelCard[i][0].text = "人";
				// 	labelCard[i][0].invalidate();
				// 	labelCard[i][1].text = "％";
				// 	labelCard[i][1].invalidate();
				// }
			}
			card[0].modified();
			card[0].show();
			// card[1].x = 200;
			card[1].show();
		}

		// =============================================================
		// シーンメッセージイベント
		let sameVoteIdx: number = -1;
		scene.onMessage.add((ev: g.MessageEvent) => {
			let selIdx: number = -1;
			if (gameStatus === GameState.Game) {
				// 終了処理
				if (ev.player == null || ev.player.id == null) return;
				// 選択された投票人数を増やす, 更に前回と違う選択の場合前回の投票人数を減らす
				if (ev.data.message === "Selected0" || ev.data.message === "FirstSelected0") {
					selIdx = 0;
					if (ev.player.id !== gameMasterId) {
						selectNum[0]++;
						if (ev.data.message === "Selected0") selectNum[1]--;
					}
				} else if (ev.data.message === "Selected1" || ev.data.message === "FirstSelected1") {
					selIdx = 1;
					if (ev.player.id !== gameMasterId) {
						selectNum[1]++;
						if (ev.data.message === "Selected1") selectNum[0]--;
					}
				} else if (ev.data.message === "SameVote") {
					sameVoteIdx = ev.data.data;
				}
				// 投票配列に登録/更
				if (selIdx !== -1) {
					if (ev.player.id === gameMasterId) {
						masterVote[ev.player.id] = selIdx;
					} else {
						guestVotes[ev.player.id] = selIdx;
					}
					// 参加人数(リスナー)
					// guestNum = selectNum[0] + selectNum[1];
					// ラベルの更新
					redrawLabels(selIdx);
				}
			}
		});

		// =============================================================
		// シーン更新時処理
		function mainLoop(): void {
			if (gameStatus === GameState.Waiting) {
				if (gameMasterId != null) {
					onGameMasterArrive();
					gameStatus = GameState.Title;
				}
			} else if (gameStatus === GameState.Title) {
				gameStatus = GameState.GameInit;
			} else if (gameStatus === GameState.GameInit) {
				const animSec: number = 60000;
				// 秒針アニメーション
				tl.create(seconds).rotateBy(-360, animSec).call(() => {
					card[0].touchable = false;
					card[1].touchable = false;
					// 視聴者側が道標だった場合
					// 配信者側だけで判定し、raiseEventを発生させる
					if (g.game.selfId === gameMasterId && selectNum[0] === selectNum[1]) {
						const r = Math.floor(2 * g.game.localRandom.generate());
						g.game.raiseEvent(new g.MessageEvent({ message: "SameVote", data: r }));
					}
					tickAudioPlayer.changeVolume(0.8);
				}).wait(200).call(() => {
					tickAudioPlayer.changeVolume(0.6);
				}).wait(200).call(() => {
					tickAudioPlayer.changeVolume(0.4);
				}).wait(200).call(() => {
					tickAudioPlayer.changeVolume(0.2);
				}).wait(200).call(() => {
					tickAudioPlayer.stop();
				}).wait(2200).call(() => {
					gameStatus = GameState.ResultInit;
				});
				// 投票数ラベル
				tl.create(lblVoteNum[0]).wait(30000).fadeOut(20000);
				tl.create(lblVoteNum[1]).wait(30000).fadeOut(20000);
				// Init系は即ステート遷移
				gameStatus = GameState.Game;
			} else if (gameStatus === GameState.Game) {
				// ※リロード/シークバー押し対策
				// 　参加してたのに、何らかの事由で最初からの場合
				if (cardPointer[0].visible() && cardPointer[1].visible()) {
					controlDisplayBug();
				}
				// Scene.setTimeOutが誤差があるので時間(Date.now)で判定
				// if (flgGetTime && Date.now() - timeStart >= 60000) {
				// 	card[0].touchable = false;
				// 	card[1].touchable = false;
				// 	gameStatus = GameState.ResultInit;
				// 	flgGetTime = false;
				// }
			} else if (gameStatus === GameState.ResultInit) {
				// 投票数ラベル
				lblVoteNum[0].opacity = 1.0;
				lblVoteNum[0].modified();
				lblVoteNum[1].opacity = 1.0;
				lblVoteNum[1].modified();
				// 選んで！退場アニメーション
				tl.create(select).call(() => {
					exit.play();
				}).fadeOut(500, Easing.easeInOutQuint).con().moveBy(0, -80, 500, Easing.easeInOutQuint);
				// 参加者退場アニメーション
				tl.create(entGuestNum)
					.fadeOut(500, Easing.easeInOutQuint).con().moveBy(0, 100, 500, Easing.easeInOutQuint);
				// 時計退場アニメーション
				tl.create(watch).wait(500).call(() => {
					exit.play();
				}).fadeOut(500, Easing.easeInOutQuint).con().moveBy(-300, 0, 500, Easing.easeInOutQuint);
				// 指削除アニメーション
				tl.create(cardPointer[0])
					.fadeOut(500, Easing.easeInOutBack);
				tl.create(cardPointer[1])
					.fadeOut(500, Easing.easeInOutBack);
				// 選択アニメーション：マスター側
				if (g.game.selfId != null) {
					let selIdx: number = 0;
					// マスターが選択した場合
					if (g.game.selfId === gameMasterId) {
						console.log("selfID:[" + g.game.selfId + "]");
						console.log("selNum[0]:[" + selectNum[0] + "]");
						console.log("selNum[1]:[" + selectNum[1] + "]");
						// if (selectNum[0] === selectNum[1]) {
						// }
						if (g.game.selfId in masterVote) {
							selIdx = masterVote[g.game.selfId];
						} else {
							selIdx = animSelection(scene, cardShadow);
						}
						tl.create(card[selIdx]).wait(1000)
							.rotateTo(0, 2000).wait(2000).call(() => {
								gameStatus = GameState.Result;
							});
						tl.create(entCard[selIdx]).wait(1000)
							.moveTo(g.game.width / 2, g.game.height / 2, 2000).con()
							.scaleTo(1.4, 1.4, 2000);
						tl.create(entCard[1 - selIdx]).wait(1000).fadeOut(2000);
					} else {		// プレイヤー側
						// 選択した人数に差異がある場合
						let selCnt: number = 0;
						if (selectNum[0] !== selectNum[1]) {
							selIdx = (selectNum[0] > selectNum[1]) ? 0 : 1;
							cardShadow[selIdx].hide();
							cardShadow[1 - selIdx].show();
						} else {			// 選択が同数だった場合
							selIdx = sameVoteIdx;
							// animSelection(scene, cardShadow, selIdx);
						}
						selCnt = Math.max(selectNum[0], selectNum[1]);
						console.log("id:[" + g.game.selfId + "]");
						console.log("selected:[" + selIdx + "]");
						// 〇票で選択されましたラベル
						lblWinningNum.text = `${selCnt}票で選択されました`;
						lblWinningNum.invalidate();
						lblWinningNum.show();
						// tl.create(card[selIdx]).wait(1000)
						// 	.rotateTo(0, 2000);
						// tl.create(entCard[selIdx]).wait(1000)
						// 	.moveTo(g.game.width / 2, g.game.height / 2, 2000).con()
						// 	.scaleTo(1.4, 1.4, 2000).call(() => {
						// 		gameStatus = GameState.Result;
						// 	});
						// tl.create(entCard[1 - selIdx]).wait(1000).fadeOut(2000);
						// 3秒後にすべてを消す
						tl.create(lblWinningNum).wait(3000).call(() => {
							lblWinningNum.hide();
							entCard[0].hide();
							entCard[1].hide();
							gameStatus = GameState.Result;
						});
					}
					gameStatus = GameState.Result;
				}
			} else if (gameStatus === GameState.Result) {
				console.log("");
			}
		}
		scene.onUpdate.add(mainLoop);
	});
	g.game.pushScene(scene);
};

export = main;

function animSelection(scene: g.Scene, card: g.Sprite[], _selIdx: number = -1): number {
	let selIdx = -1;
	if (_selIdx === -1) {
		selIdx = Math.floor(2 * g.game.localRandom.generate());
	} else {
		selIdx = _selIdx;
	}
	card[1].show();
	const intervalID = scene.setInterval(() => {
		if (card[0].visible()) {
			card[0].hide();
		} else {
			card[0].show();
		}
		if (card[1].visible()) {
			card[1].hide();
		} else {
			card[1].show();
		}
	}, 100);
	scene.setTimeout(() => {
		card[selIdx].hide();
		card[1 - selIdx].show();
		scene.clearInterval(intervalID);
	}, 1000);
	return selIdx;
}

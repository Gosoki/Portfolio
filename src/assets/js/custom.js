(function ($) {

	'use strict';

	$(document).ready(function () {

		/* ---------------------------------------------- /*
		 * Navbar
		/* ---------------------------------------------- */

		$('.header').sticky({
			topSpacing: 0
		});

		$('body').scrollspy({
			target: '.navbar-custom',
			offset: 70
		});

		/* ---------------------------------------------- /*
		 * Home BG
		/* ---------------------------------------------- */

		var $screenHeight = $('.screen-height');
		var lastWidth = $(window).width();

		function fitScreenHeight() {
			$screenHeight.height($(window).height());
		}

		fitScreenHeight();

		var resizeTimer;
		$(window).on('resize', function () {
			// モバイルではアドレスバーの伸縮でも resize が飛ぶため、
			// 横幅が変わったときだけ高さを取り直す
			var width = $(window).width();
			if (width === lastWidth) {
				return;
			}
			lastWidth = width;

			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(fitScreenHeight, 100);
		});

	});

})(jQuery);

/*
 * 以下の処理はこのページでは使われていないため削除しました（2026-08-24）:
 *
 * - Preloader (#status / #preloader)
 *     該当要素が存在しない。ローディング表示は index.html の .loader-wrapper が担当。
 * - $('a[href*=#]') のスムーススクロール
 *     index.html 側のスムーススクロールと二重に animate() が走り、
 *     固定ヘッダー分のオフセット補正も無かった。index.html 側に一本化。
 * - .scroll-up の fadeIn / fadeOut
 *     index.html の .scroll-up.show クラスによる制御と競合していた。
 * - .skills の waypoint による easyPieChart 初期化
 *     index.html 側でも初期化しており、色（#FF5252 と #5cb85c）と
 *     サイズ（140 と 150）が途中で入れ替わっていた。index.html 側に一本化。
 * - $('#cbp-qtrotator').cbpQTRotator()
 *     プラグイン jquery.cbpQTRotator.js を読み込んでいないため TypeError になっていた。
 * - WOW の初期化
 *     index.html 側でも new WOW().init() しており、二重初期化になっていた。
 * - メールアドレス検証 / #contact-form の Ajax 送信
 *     ページに問い合わせフォームが無く、送信先 assets/php/contact.php も存在しない。
 * - #home のパララックス（$('#home').parallax('50%', 0.01)）
 *     speedFactor 0.01 は「1000px スクロールしても背景は 10px しか動かない」設定で、
 *     背景が画面に貼り付いたまま本文だけが流れていた。
 *     背景をセクションと一緒にスクロールさせるため削除（CSS の
 *     background-attachment: scroll に任せる）。
 */

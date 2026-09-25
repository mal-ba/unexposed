// ====== support-chat.js : 문의하기 FAQ 챗봇 (문의하기 버튼을 처음 눌렀을 때만 불러와요) ======
// 다국어 지원: i18n.js가 저장한 언어(localStorage 'unexposed-lang')에 맞춰
// 헤더·입력창·인사말·추천 질문·답변이 모두 바뀌어요. 키워드는 모든 언어 것을 한꺼번에
// 검사하기 때문에, 사용자가 어떤 언어로 물어봐도 같은 답을 찾아요.
(function initSupportChat(){
  const DATA = {
 "ui": {
  "ko": {
   "title": "UNEXPOSED 문의하기",
   "sub": "자주 묻는 질문에 바로 답해드려요",
   "ph": "궁금한 걸 물어보세요 (예: 결제, 로그인, 스캔...)",
   "send": "전송",
   "close": "닫기",
   "hello": "안녕하세요! UNEXPOSED에 대해 궁금한 걸 물어보세요. 스캔, 로그인, 결제, 원단, 옷장 등 무엇이든 답해드릴게요. (규칙 기반 FAQ 챗봇이에요)",
   "fallback": "죄송해요, 정확히 이해하지 못했어요. 아래 추천 질문 중 하나를 눌러보시거나, 스캔·로그인·결제·원단·옷장 중 어떤 부분이 궁금한지 다시 말씀해주시겠어요?",
   "sug": [
    "스캔은 어떻게 해요?",
    "요금제가 어떻게 되나요?",
    "구글 로그인이 안 돼요",
    "내 사진이 저장되나요?"
   ],
   "a": [
    "스캔은 \"scan demo\" 섹션의 \"3D로 꾸미기 시작\" 또는 \"2D로 꾸미기 시작\" 버튼을 누르면 시작돼요. 카메라 권한을 허용하면 사진 촬영이나 5초 동영상 녹화를 할 수 있고, 카메라를 쓸 수 없으면 사진·동영상 파일을 업로드해도 돼요.",
    "Google 계정으로 로그인해서 유료 플랜 구독이나 결제를 할 수 있어요. 카카오톡·클로드 앱 같은 인앱 브라우저에서는 구글 보안 정책상 로그인이 막혀 있어서, 화면 위 배너의 \"외부 브라우저로 열기\"를 눌러서 크롬·사파리로 열어주세요.",
    "요금제는 월간 결제 9,900원, 연간 결제 109,800원 두 가지예요. 연간 결제는 월간으로 12개월 내는 금액(118,800원)보다 7.6% 저렴해요. 요금제 섹션에서 \"구독하기\"를 누르면 결제 페이지로 이동해요.",
    "원단 등급(베이직/프리미엄/스페셜), 디테일 옵션(자수·특수재단), 완성 형태(패턴 PDF/완제품 배송)를 골라서 실시간으로 예상 제작 견적을 확인할 수 있어요. \"기타(직접 요청)\"를 선택하면 원하는 원단·디자인을 자유롭게 적을 수도 있어요.",
    "스캔 화면 안 \"옷장 & 꾸미기\"에서 기본 제공 아이템을 둘러보거나, 연령대·상황에 맞춰 추천받거나, 직접 만든 옷·장신구(.glb 파일)를 올려서 마네킹에 입혀볼 수 있어요.",
    "키(cm)를 입력하고 \"아바타 생성하기\"를 누르면 3D 마네킹 크기가 그 비율에 맞게 조정돼요. 마우스나 손가락으로 드래그하면 360도로 돌려볼 수 있어요.",
    "지금은 데모 버전이라 실제 제작·배송은 아직 연결되어 있지 않아요. 정식 서비스에서는 완성한 디자인을 파트너 제작사에 도면(PDF)으로 넘기거나, 완제품으로 배송받는 옵션을 고를 수 있게 될 예정이에요.",
    "신체 데이터(사진·키)는 로그인 후 \"신체 데이터 수집·보관\"에 직접 동의한 경우에만 저장돼요. 동의하지 않으면 화면에만 보이고 서버에는 저장되지 않고, 언제든 왼쪽 상단 메뉴의 \"신체 데이터 동의 설정\"에서 동의를 바꾸거나 저장된 데이터를 삭제할 수 있어요.",
    "UNEXPOSED는 PentaCorp(펜타콘) 팀이 만든 서비스예요. 지금은 데모 단계라, 더 궁금한 점은 이 채팅으로 남겨주시면 확인 후 도와드릴게요."
   ]
  },
  "en": {
   "title": "UNEXPOSED Support",
   "sub": "Instant answers to frequently asked questions",
   "ph": "Ask a question (e.g. payment, sign-in, scan...)",
   "send": "Send",
   "close": "Close",
   "hello": "Hi! Ask anything about UNEXPOSED — scanning, sign-in, payment, fabrics, the wardrobe and more. (This is a rule-based FAQ chatbot.)",
   "fallback": "Sorry, I didn't quite understand. Tap one of the suggested questions below, or tell me again which part you're curious about: scanning, sign-in, payment, fabrics or the wardrobe.",
   "sug": [
    "How do I scan?",
    "What are the plans?",
    "Google sign-in doesn't work",
    "Are my photos stored?"
   ],
   "a": [
    "To start scanning, press the \"Start in 3D\" or \"Start in 2D\" button in the scan demo section. Allow camera access to take a photo or record a 5-second video — if you can’t use the camera, you can upload a photo or video file instead.",
    "Sign in with your Google account to subscribe to a paid plan or make a payment. In in-app browsers like KakaoTalk or the Claude app, Google blocks sign-in for security reasons — tap \"Open in external browser\" in the banner at the top to open the page in Chrome or Safari.",
    "There are two plans: monthly at 9,900 KRW and yearly at 109,800 KRW. The yearly plan is 7.6% cheaper than paying monthly for 12 months (118,800 KRW). Press \"Subscribe\" in the pricing section to go to the payment page.",
    "Choose a fabric tier (Basic/Premium/Special), detail options (embroidery, special cutting) and the finished form (pattern PDF / finished garment delivery) to see an estimated production quote in real time. Choose \"Other (custom request)\" to freely describe the fabric or design you want.",
    "In \"Wardrobe & Styling\" on the scan screen, you can browse the default items, get recommendations by age group and occasion, or upload your own clothes and accessories (.glb files) to try them on the mannequin.",
    "Enter your height (cm) and press \"Create avatar\" — the 3D mannequin is resized to match. Drag with your mouse or finger to rotate it 360 degrees.",
    "This is a demo version, so actual production and delivery aren’t connected yet. In the full service, you’ll be able to send your finished design to a partner workshop as a pattern (PDF) or choose to receive it as a finished garment.",
    "Body data (photos, height) is stored only if you sign in and explicitly agree to \"Body data collection & storage.\" If you don’t agree, it’s only shown on screen and never saved to the server, and you can change your consent or delete stored data anytime under \"Body data consent\" in the top-left menu.",
    "UNEXPOSED is a service built by the PentaCorp team. We’re still in the demo stage, so if you have more questions, leave them in this chat and we’ll check and help."
   ]
  },
  "ru": {
   "title": "Поддержка UNEXPOSED",
   "sub": "Мгновенные ответы на частые вопросы",
   "ph": "Задайте вопрос (например: оплата, вход, сканирование...)",
   "send": "Отправить",
   "close": "Закрыть",
   "hello": "Здравствуйте! Спросите что угодно об UNEXPOSED — сканирование, вход, оплата, ткани, гардероб и многое другое. (Это FAQ-чатбот на основе правил)",
   "fallback": "Извините, я не совсем понял. Нажмите на один из предложенных вопросов ниже или уточните, что вас интересует: сканирование, вход, оплата, ткани или гардероб.",
   "sug": [
    "Как пройти сканирование?",
    "Какие есть тарифы?",
    "Не работает вход через Google",
    "Сохраняются ли мои фото?"
   ],
   "a": [
    "Чтобы начать сканирование, нажмите кнопку «Начать в 3D» или «Начать в 2D» в разделе scan demo. Разрешите доступ к камере, чтобы сделать фото или записать 5-секундное видео; если камера недоступна, можно загрузить файл фото или видео.",
    "Войдите через аккаунт Google, чтобы оформить платный тариф или оплатить. Во встроенных браузерах вроде KakaoTalk или приложения Claude Google блокирует вход из соображений безопасности — нажмите «Открыть во внешнем браузере» в баннере сверху и откройте страницу в Chrome или Safari.",
    "Есть два тарифа: помесячно — 9 900 вон, за год — 109 800 вон. Годовой тариф на 7,6% дешевле, чем 12 месяцев помесячной оплаты (118 800 вон). Нажмите «Оформить подписку» в разделе с ценами, чтобы перейти к оплате.",
    "Выберите уровень ткани (Basic/Premium/Special), детали (вышивка, особый крой) и форму результата (PDF-выкройка / доставка готового изделия) — и сразу увидите примерную стоимость производства. Вариант «Другое (свой запрос)» позволяет свободно описать нужную ткань или дизайн.",
    "В разделе «Гардероб и стиль» на экране сканирования можно просматривать базовые вещи, получать рекомендации по возрасту и ситуации или загружать свою одежду и аксессуары (.glb-файлы) и примерять их на манекене.",
    "Введите рост (см) и нажмите «Создать аватар» — 3D-манекен подстроится под эти пропорции. Перетаскивайте мышью или пальцем, чтобы повернуть его на 360 градусов.",
    "Это демо-версия, поэтому реальное производство и доставка пока не подключены. В полной версии вы сможете передать готовый дизайн партнёрской мастерской в виде выкройки (PDF) или получить готовое изделие.",
    "Данные тела (фото, рост) сохраняются, только если вы вошли в аккаунт и сами согласились на «Сбор и хранение данных тела». Без согласия они лишь отображаются на экране и не сохраняются на сервере; согласие можно изменить или удалить сохранённые данные в любое время в пункте «Согласие на данные тела» в меню слева вверху.",
    "UNEXPOSED — сервис, созданный командой PentaCorp. Сейчас это демо-этап, поэтому, если остались вопросы, оставьте их в этом чате — мы проверим и поможем."
   ]
  },
  "zh": {
   "title": "UNEXPOSED 咨询",
   "sub": "常见问题即时解答",
   "ph": "请输入问题（例如：付款、登录、扫描...）",
   "send": "发送",
   "close": "关闭",
   "hello": "你好！关于 UNEXPOSED 的任何问题都可以问我——扫描、登录、付款、面料、衣柜等。（这是基于规则的 FAQ 聊天机器人）",
   "fallback": "抱歉，我没能完全理解。请点击下方推荐问题，或告诉我你想了解扫描、登录、付款、面料、衣柜中的哪一项。",
   "sug": [
    "怎么进行扫描？",
    "有哪些套餐？",
    "无法用 Google 登录",
    "我的照片会被保存吗？"
   ],
   "a": [
    "在 scan demo 区域点击“开始3D设计” 或 “开始2D设计”按钮即可开始扫描。允许相机权限后可以拍照或录制 5 秒视频；如果无法使用相机，也可以上传照片或视频文件。",
    "使用 Google 账号登录后即可订阅付费套餐或付款。在 KakaoTalk、Claude 应用等内置浏览器中，Google 出于安全政策会阻止登录，请点击页面顶部横幅中的“在外部浏览器中打开”，用 Chrome 或 Safari 打开。",
    "共有两种套餐：按月 9,900 韩元，按年 109,800 韩元。按年付费比按月付 12 个月（118,800 韩元）便宜 7.6%。在价格区域点击“订阅”即可进入付款页面。",
    "选择面料等级（基础/高级/特殊）、细节选项（刺绣、特殊裁剪）和成品形式（版型 PDF / 成品配送），即可实时查看预估制作报价。选择“其他（自定义需求）”还可以自由填写想要的面料或设计。",
    "在扫描页面的“衣柜与装扮”中，可以浏览默认单品、按年龄段和场合获取推荐，或上传自己制作的衣服和配饰（.glb 文件）穿到人台上试看。",
    "输入身高（cm）并点击“生成虚拟形象”，3D 人台会按比例调整大小。用鼠标或手指拖动即可 360 度旋转查看。",
    "目前是演示版本，实际制作和配送尚未接入。正式服务中，你可以把完成的设计以版型（PDF）交给合作工坊，或选择直接收取成品。",
    "身体数据（照片、身高）只有在登录后亲自同意“身体数据收集与保存”时才会保存。不同意的话只会显示在屏幕上，不会保存到服务器；你也可以随时在左上角菜单的“身体数据同意设置”中更改同意或删除已保存的数据。",
    "UNEXPOSED 是由 PentaCorp 团队打造的服务。目前处于演示阶段，如有更多问题，请在此聊天中留言，我们确认后会帮助你。"
   ]
  },
  "ja": {
   "title": "UNEXPOSED お問い合わせ",
   "sub": "よくある質問にすぐお答えします",
   "ph": "質問を入力してください（例：決済、ログイン、スキャン...）",
   "send": "送信",
   "close": "閉じる",
   "hello": "こんにちは！UNEXPOSEDについて何でも聞いてください。スキャン、ログイン、決済、生地、クローゼットなど、何でもお答えします。（ルールベースのFAQチャットボットです）",
   "fallback": "すみません、よく理解できませんでした。下のおすすめ質問を押すか、スキャン・ログイン・決済・生地・クローゼットのどれについて知りたいか、もう一度教えてください。",
   "sug": [
    "スキャンはどうやるの？",
    "料金プランは？",
    "Googleログインができない",
    "写真は保存されますか？"
   ],
   "a": [
    "scan demoセクションの「3Dで始める」 または 「2Dで始める」ボタンを押すとスキャンが始まります。カメラへのアクセスを許可すると写真撮影や5秒の動画録画ができ、カメラが使えない場合は写真・動画ファイルをアップロードしても大丈夫です。",
    "Googleアカウントでログインすると、有料プランの購読や決済ができます。KakaoTalkやClaudeアプリなどのアプリ内ブラウザでは、Googleのセキュリティポリシーによりログインがブロックされるため、画面上部のバナーの「外部ブラウザで開く」を押してChromeやSafariで開いてください。",
    "プランは月額9,900ウォンと年額109,800ウォンの2種類です。年額プランは月額で12か月払う場合（118,800ウォン）より7.6%お得です。料金セクションの「購読する」を押すと決済ページに移動します。",
    "生地のグレード（ベーシック/プレミアム/スペシャル）、ディテールオプション（刺繍・特殊裁断）、完成形態（パターンPDF/完成品配送）を選ぶと、予想製作見積もりをリアルタイムで確認できます。「その他（直接リクエスト）」を選べば、希望の生地やデザインを自由に書くこともできます。",
    "スキャン画面内の「クローゼット＆コーディネート」で、基本アイテムを見たり、年代やシーンに合わせたおすすめを受けたり、自作の服・アクセサリー（.glbファイル）をアップロードしてマネキンに着せてみることができます。",
    "身長（cm）を入力して「アバターを生成」を押すと、3Dマネキンのサイズがその比率に合わせて調整されます。マウスや指でドラッグすると360度回転させて見られます。",
    "現在はデモ版のため、実際の製作・配送はまだ連携していません。正式サービスでは、完成したデザインをパートナー工房にパターン（PDF）として渡すか、完成品として配送を受けるオプションを選べるようになる予定です。",
    "身体データ（写真・身長）は、ログイン後に「身体データの収集・保管」に自分で同意した場合にのみ保存されます。同意しなければ画面に表示されるだけでサーバーには保存されず、いつでも左上メニューの「身体データの同意設定」で同意を変更したり、保存済みデータを削除したりできます。",
    "UNEXPOSEDはPentaCorpチームが作ったサービスです。現在はデモ段階なので、さらに気になることはこのチャットに残していただければ、確認してお手伝いします。"
   ]
  },
  "fr": {
   "title": "Contacter UNEXPOSED",
   "sub": "Réponses immédiates aux questions fréquentes",
   "ph": "Posez votre question (ex. : paiement, connexion, scan...)",
   "send": "Envoyer",
   "close": "Fermer",
   "hello": "Bonjour ! Posez-moi toutes vos questions sur UNEXPOSED — scan, connexion, paiement, tissus, garde-robe et plus encore. (Chatbot FAQ basé sur des règles)",
   "fallback": "Désolé, je n'ai pas bien compris. Touchez l'une des questions suggérées ci-dessous, ou dites-moi ce qui vous intéresse : scan, connexion, paiement, tissus ou garde-robe.",
   "sug": [
    "Comment faire le scan ?",
    "Quelles sont les formules ?",
    "La connexion Google ne marche pas",
    "Mes photos sont-elles conservées ?"
   ],
   "a": [
    "Le scan démarre en appuyant sur le bouton « Commencer en 3D  ou  Commencer en 2D » dans la section scan demo. En autorisant la caméra, vous pouvez prendre une photo ou filmer une vidéo de 5 secondes ; si la caméra n'est pas disponible, vous pouvez importer une photo ou une vidéo.",
    "Connectez-vous avec votre compte Google pour souscrire à une formule payante ou payer. Dans les navigateurs intégrés comme KakaoTalk ou l'app Claude, Google bloque la connexion pour des raisons de sécurité : appuyez sur « Ouvrir dans un navigateur externe » dans la bannière en haut pour ouvrir la page dans Chrome ou Safari.",
    "Il existe deux formules : mensuelle à 9 900 KRW et annuelle à 109 800 KRW. La formule annuelle est 7,6 % moins chère que 12 mois en mensuel (118 800 KRW). Appuyez sur « S’abonner » dans la section tarifs pour accéder au paiement.",
    "Choisissez le niveau de tissu (Basic/Premium/Special), les options de détail (broderie, coupe spéciale) et la forme finale (patron PDF / livraison du vêtement fini) pour voir un devis de fabrication estimé en temps réel. Avec « Autre (demande libre) », vous pouvez décrire librement le tissu ou le design souhaité.",
    "Dans « Garde-robe & style » sur l'écran de scan, vous pouvez parcourir les articles de base, obtenir des recommandations selon l'âge et l'occasion, ou importer vos propres vêtements et accessoires (fichiers .glb) pour les essayer sur le mannequin.",
    "Saisissez votre taille (cm) et appuyez sur « Créer l'avatar » : le mannequin 3D s'ajuste à ces proportions. Faites glisser avec la souris ou le doigt pour le faire pivoter à 360 degrés.",
    "Il s'agit d'une version de démonstration : la fabrication et la livraison réelles ne sont pas encore connectées. Dans le service final, vous pourrez envoyer votre design à un atelier partenaire sous forme de patron (PDF) ou choisir de recevoir le vêtement fini.",
    "Les données corporelles (photos, taille) ne sont conservées que si vous vous connectez et acceptez explicitement la « collecte et conservation des données corporelles ». Sinon, elles s'affichent seulement à l'écran sans être enregistrées sur le serveur, et vous pouvez modifier votre consentement ou supprimer les données enregistrées à tout moment via « Consentement données corporelles » dans le menu en haut à gauche.",
    "UNEXPOSED est un service créé par l'équipe PentaCorp. Nous sommes encore en phase de démo : si vous avez d'autres questions, laissez-les dans ce chat et nous vous aiderons après vérification."
   ]
  },
  "de": {
   "title": "UNEXPOSED Support",
   "sub": "Sofortige Antworten auf häufige Fragen",
   "ph": "Stell eine Frage (z. B. Zahlung, Anmeldung, Scan...)",
   "send": "Senden",
   "close": "Schließen",
   "hello": "Hallo! Frag mich alles über UNEXPOSED – Scan, Anmeldung, Zahlung, Stoffe, Kleiderschrank und mehr. (Regelbasierter FAQ-Chatbot)",
   "fallback": "Entschuldigung, das habe ich nicht ganz verstanden. Tippe auf eine der vorgeschlagenen Fragen unten oder sag mir noch einmal, worum es geht: Scan, Anmeldung, Zahlung, Stoffe oder Kleiderschrank.",
   "sug": [
    "Wie funktioniert der Scan?",
    "Welche Tarife gibt es?",
    "Google-Anmeldung klappt nicht",
    "Werden meine Fotos gespeichert?"
   ],
   "a": [
    "Der Scan startet, wenn du im Bereich scan demo auf „In 3D starten“ oder „In 2D starten“ tippst. Erlaubst du den Kamerazugriff, kannst du ein Foto machen oder ein 5-Sekunden-Video aufnehmen; ohne Kamera kannst du auch eine Foto- oder Videodatei hochladen.",
    "Mit deinem Google-Konto kannst du dich anmelden, um einen kostenpflichtigen Plan zu abonnieren oder zu bezahlen. In In-App-Browsern wie KakaoTalk oder der Claude-App blockiert Google die Anmeldung aus Sicherheitsgründen – tippe im Banner oben auf „In externem Browser öffnen“ und öffne die Seite in Chrome oder Safari.",
    "Es gibt zwei Tarife: monatlich für 9.900 KRW und jährlich für 109.800 KRW. Der Jahrestarif ist 7,6 % günstiger als 12 Monate monatliche Zahlung (118.800 KRW). Tippe im Preisbereich auf „Abonnieren“, um zur Zahlungsseite zu gelangen.",
    "Wähle Stoffstufe (Basic/Premium/Special), Detailoptionen (Stickerei, Spezialschnitt) und die Endform (Schnittmuster-PDF / Lieferung des fertigen Stücks), um in Echtzeit ein geschätztes Produktionsangebot zu sehen. Mit „Sonstiges (eigener Wunsch)“ kannst du Stoff oder Design frei beschreiben.",
    "Unter „Kleiderschrank & Styling“ im Scan-Bildschirm kannst du Standardteile durchstöbern, Empfehlungen nach Alter und Anlass erhalten oder eigene Kleidung und Accessoires (.glb-Dateien) hochladen und an der Schneiderpuppe anprobieren.",
    "Gib deine Größe (cm) ein und tippe auf „Avatar erstellen“ – die 3D-Puppe passt sich diesen Proportionen an. Ziehe mit Maus oder Finger, um sie um 360 Grad zu drehen.",
    "Dies ist eine Demoversion, Produktion und Lieferung sind noch nicht angebunden. Im fertigen Service kannst du dein Design als Schnittmuster (PDF) an eine Partnerwerkstatt geben oder dir das fertige Kleidungsstück liefern lassen.",
    "Körperdaten (Fotos, Größe) werden nur gespeichert, wenn du angemeldet bist und der „Erhebung und Speicherung von Körperdaten“ ausdrücklich zustimmst. Ohne Zustimmung werden sie nur angezeigt und nicht auf dem Server gespeichert; Zustimmung ändern oder gespeicherte Daten löschen kannst du jederzeit unter „Einwilligung Körperdaten“ im Menü oben links.",
    "UNEXPOSED ist ein Service des PentaCorp-Teams. Wir sind noch in der Demophase – wenn du weitere Fragen hast, hinterlass sie hier im Chat, und wir helfen dir, sobald wir sie geprüft haben."
   ]
  },
  "ar": {
   "title": "تواصل مع UNEXPOSED",
   "sub": "إجابات فورية على الأسئلة الشائعة",
   "ph": "اكتب سؤالك (مثل: الدفع، تسجيل الدخول، المسح...)",
   "send": "إرسال",
   "close": "إغلاق",
   "hello": "مرحبًا! اسألني أي شيء عن UNEXPOSED — المسح، تسجيل الدخول، الدفع، الأقمشة، خزانة الملابس وغير ذلك. (روبوت أسئلة شائعة قائم على القواعد)",
   "fallback": "عذرًا، لم أفهم تمامًا. اضغط على أحد الأسئلة المقترحة أدناه، أو أخبرني مجددًا أي جزء يهمك: المسح، تسجيل الدخول، الدفع، الأقمشة، أو خزانة الملابس.",
   "sug": [
    "كيف أقوم بالمسح؟",
    "ما هي خطط الاشتراك؟",
    "تسجيل الدخول عبر Google لا يعمل",
    "هل يتم حفظ صوري؟"
   ],
   "a": [
    "يبدأ المسح عند الضغط على زر \"ابدأ بتصميم ثلاثي الأبعاد\" أو \"ابدأ بتصميم ثنائي الأبعاد\" في قسم scan demo. بعد السماح بالوصول إلى الكاميرا يمكنك التقاط صورة أو تسجيل فيديو مدته 5 ثوانٍ، وإذا تعذّر استخدام الكاميرا يمكنك رفع ملف صورة أو فيديو.",
    "سجّل الدخول بحساب Google للاشتراك في خطة مدفوعة أو الدفع. في المتصفحات المدمجة داخل التطبيقات مثل KakaoTalk أو تطبيق Claude، تحظر Google تسجيل الدخول لأسباب أمنية، لذا اضغط \"افتح في متصفح خارجي\" في الشريط أعلى الصفحة وافتحها في Chrome أو Safari.",
    "هناك خطتان: شهرية بسعر 9,900 وون وسنوية بسعر 109,800 وون. الخطة السنوية أرخص بنسبة 7.6% من الدفع الشهري لمدة 12 شهرًا (118,800 وون). اضغط \"اشترك\" في قسم الأسعار للانتقال إلى صفحة الدفع.",
    "اختر مستوى القماش (أساسي/متميز/خاص) وخيارات التفاصيل (تطريز، قصّ خاص) وشكل المنتج النهائي (نمط PDF / توصيل القطعة الجاهزة) لترى تقديرًا فوريًا لسعر الإنتاج. وباختيار \"أخرى (طلب خاص)\" يمكنك وصف القماش أو التصميم الذي تريده بحرية.",
    "في قسم \"الخزانة والتنسيق\" داخل شاشة المسح، يمكنك تصفح القطع الأساسية، أو الحصول على اقتراحات حسب الفئة العمرية والمناسبة، أو رفع ملابسك وإكسسواراتك الخاصة (ملفات glb.) وتجربتها على المانيكان.",
    "أدخل طولك (سم) واضغط \"إنشاء الصورة الرمزية\"، فيتغير حجم المانيكان ثلاثي الأبعاد وفقًا لهذه النسبة. اسحب بالفأرة أو بإصبعك لتدويره 360 درجة.",
    "هذه نسخة تجريبية، لذا لم يتم ربط التصنيع والتوصيل الفعليين بعد. في الخدمة الرسمية ستتمكن من إرسال تصميمك النهائي إلى ورشة شريكة كنمط (PDF) أو اختيار استلامه كقطعة جاهزة.",
    "لا تُحفظ بيانات الجسد (الصور، الطول) إلا إذا سجّلت الدخول ووافقت بنفسك على \"جمع بيانات الجسد وحفظها\". بدون الموافقة تُعرض على الشاشة فقط ولا تُحفظ على الخادم، ويمكنك في أي وقت تغيير موافقتك أو حذف البيانات المحفوظة من \"إعدادات الموافقة على بيانات الجسد\" في القائمة أعلى اليسار.",
    "UNEXPOSED خدمة من تطوير فريق PentaCorp. ما زلنا في مرحلة تجريبية، فإن كانت لديك أسئلة أخرى اتركها في هذه المحادثة وسنراجعها ونساعدك."
   ]
  },
  "vi": {
   "title": "Liên hệ UNEXPOSED",
   "sub": "Trả lời ngay các câu hỏi thường gặp",
   "ph": "Nhập câu hỏi (vd: thanh toán, đăng nhập, quét...)",
   "send": "Gửi",
   "close": "Đóng",
   "hello": "Xin chào! Hãy hỏi bất cứ điều gì về UNEXPOSED — quét cơ thể, đăng nhập, thanh toán, vải, tủ đồ và hơn thế nữa. (Đây là chatbot FAQ dựa trên quy tắc)",
   "fallback": "Xin lỗi, mình chưa hiểu rõ. Hãy nhấn một câu hỏi gợi ý bên dưới, hoặc cho mình biết bạn quan tâm phần nào: quét, đăng nhập, thanh toán, vải hay tủ đồ.",
   "sug": [
    "Quét cơ thể thế nào?",
    "Có những gói nào?",
    "Không đăng nhập Google được",
    "Ảnh của tôi có bị lưu không?"
   ],
   "a": [
    "Nhấn nút \"Bắt đầu bằng 3D\" hoặc \"Bắt đầu bằng 2D\" trong mục scan demo để bắt đầu quét. Khi cho phép truy cập camera, bạn có thể chụp ảnh hoặc quay video 5 giây; nếu không dùng được camera, bạn có thể tải lên tệp ảnh hoặc video.",
    "Đăng nhập bằng tài khoản Google để đăng ký gói trả phí hoặc thanh toán. Trong trình duyệt trong ứng dụng như KakaoTalk hay ứng dụng Claude, Google chặn đăng nhập vì lý do bảo mật — hãy nhấn \"Mở bằng trình duyệt bên ngoài\" trên biểu ngữ phía trên để mở bằng Chrome hoặc Safari.",
    "Có hai gói: theo tháng 9.900 won và theo năm 109.800 won. Gói năm rẻ hơn 7,6% so với trả theo tháng trong 12 tháng (118.800 won). Nhấn \"Đăng ký\" ở mục bảng giá để chuyển đến trang thanh toán.",
    "Chọn cấp độ vải (Basic/Premium/Special), tùy chọn chi tiết (thêu, cắt đặc biệt) và hình thức hoàn thiện (rập PDF / giao thành phẩm) để xem báo giá sản xuất ước tính theo thời gian thực. Chọn \"Khác (yêu cầu riêng)\" để tự do mô tả loại vải hay thiết kế bạn muốn.",
    "Trong mục \"Tủ đồ & Phối đồ\" ở màn hình quét, bạn có thể xem các món có sẵn, nhận gợi ý theo độ tuổi và hoàn cảnh, hoặc tải lên quần áo và phụ kiện tự làm (tệp .glb) để mặc thử lên ma-nơ-canh.",
    "Nhập chiều cao (cm) và nhấn \"Tạo avatar\", ma-nơ-canh 3D sẽ được điều chỉnh theo tỉ lệ đó. Kéo bằng chuột hoặc ngón tay để xoay 360 độ.",
    "Đây là bản demo nên việc sản xuất và giao hàng thực tế chưa được kết nối. Ở dịch vụ chính thức, bạn có thể gửi thiết kế hoàn chỉnh cho xưởng đối tác dưới dạng rập (PDF) hoặc chọn nhận thành phẩm.",
    "Dữ liệu cơ thể (ảnh, chiều cao) chỉ được lưu khi bạn đăng nhập và tự đồng ý \"Thu thập & lưu trữ dữ liệu cơ thể\". Nếu không đồng ý, dữ liệu chỉ hiển thị trên màn hình và không lưu vào máy chủ; bạn có thể thay đổi sự đồng ý hoặc xóa dữ liệu đã lưu bất cứ lúc nào tại mục \"Đồng ý dữ liệu cơ thể\" trong menu góc trên bên trái.",
    "UNEXPOSED là dịch vụ do đội PentaCorp phát triển. Hiện vẫn đang ở giai đoạn demo, nếu còn thắc mắc, hãy để lại trong khung chat này, chúng tôi sẽ kiểm tra và hỗ trợ."
   ]
  },
  "ne": {
   "title": "UNEXPOSED सम्पर्क",
   "sub": "धेरै सोधिने प्रश्नहरूको तुरुन्त जवाफ",
   "ph": "प्रश्न सोध्नुहोस् (जस्तै: भुक्तानी, लगइन, स्क्यान...)",
   "send": "पठाउनुहोस्",
   "close": "बन्द गर्नुहोस्",
   "hello": "नमस्ते! UNEXPOSED बारे जे पनि सोध्नुहोस् — स्क्यान, लगइन, भुक्तानी, कपडा, वार्डरोब आदि। (यो नियममा आधारित FAQ च्याटबट हो)",
   "fallback": "माफ गर्नुहोस्, राम्रोसँग बुझिनँ। तलका सुझाव गरिएका प्रश्नमध्ये एउटा थिच्नुहोस्, वा स्क्यान, लगइन, भुक्तानी, कपडा, वार्डरोबमध्ये कुन विषय जान्न चाहनुहुन्छ फेरि भन्नुहोस्।",
   "sug": [
    "स्क्यान कसरी गर्ने?",
    "कस्ता योजनाहरू छन्?",
    "Google लगइन भएन",
    "मेरा फोटो सुरक्षित राखिन्छन्?"
   ],
   "a": [
    "scan demo खण्डको \"3D मा सुरु गर्नुहोस्\" वा \"2D मा सुरु गर्नुहोस्\" बटन थिचेपछि स्क्यान सुरु हुन्छ। क्यामेरा अनुमति दिएपछि फोटो खिच्न वा ५ सेकेन्डको भिडियो रेकर्ड गर्न सकिन्छ; क्यामेरा चलाउन नसके फोटो वा भिडियो फाइल अपलोड गर्न पनि सकिन्छ।",
    "Google खाताबाट लगइन गरेर शुल्क योजना सदस्यता लिन वा भुक्तानी गर्न सकिन्छ। KakaoTalk वा Claude एप जस्ता इन-एप ब्राउजरमा Google ले सुरक्षा नीतिका कारण लगइन रोक्छ, त्यसैले माथिको ब्यानरमा \"बाह्य ब्राउजरमा खोल्नुहोस्\" थिचेर Chrome वा Safari मा खोल्नुहोस्।",
    "दुई योजना छन्: मासिक ९,९०० वन र वार्षिक १,०९,८०० वन। वार्षिक योजना १२ महिना मासिक तिर्नुभन्दा (१,१८,८०० वन) ७.६% सस्तो छ। मूल्य खण्डमा \"सदस्यता लिनुहोस्\" थिचेपछि भुक्तानी पृष्ठमा जान्छ।",
    "कपडाको तह (बेसिक/प्रिमियम/स्पेशल), विवरण विकल्प (कढाइ, विशेष काटाइ) र अन्तिम रूप (ढाँचा PDF / तयारी लुगा डेलिभरी) छानेर अनुमानित उत्पादन मूल्य तुरुन्तै हेर्न सकिन्छ। \"अन्य (आफ्नै अनुरोध)\" छाने मनपर्ने कपडा वा डिजाइन खुला रूपमा लेख्न सकिन्छ।",
    "स्क्यान स्क्रिनभित्रको \"वार्डरोब र सजावट\" मा आधारभूत सामानहरू हेर्न, उमेर र अवसर अनुसार सुझाव लिन, वा आफैंले बनाएका लुगा·गहना (.glb फाइल) अपलोड गरेर म्यानिकिनमा लगाएर हेर्न सकिन्छ।",
    "उचाइ (cm) हालेर \"अवतार बनाउनुहोस्\" थिचेपछि 3D म्यानिकिनको आकार त्यही अनुपातमा मिलाइन्छ। माउस वा औंलाले तानेर ३६० डिग्री घुमाएर हेर्न सकिन्छ।",
    "यो डेमो संस्करण भएकाले वास्तविक उत्पादन र डेलिभरी अझै जोडिएको छैन। आधिकारिक सेवामा तयार डिजाइनलाई साझेदार कार्यशालामा ढाँचा (PDF) का रूपमा पठाउन वा तयारी लुगा नै प्राप्त गर्ने विकल्प छान्न सकिनेछ।",
    "शरीर डेटा (फोटो, उचाइ) लगइनपछि \"शरीर डेटा सङ्कलन·भण्डारण\" मा आफैं सहमति दिएमा मात्र सुरक्षित हुन्छ। सहमति नदिए स्क्रिनमा मात्र देखिन्छ, सर्भरमा सुरक्षित हुँदैन; माथि बायाँ मेनुको \"शरीर डेटा सहमति\" मा जुनसुकै बेला सहमति बदल्न वा सुरक्षित डेटा मेटाउन सकिन्छ।",
    "UNEXPOSED PentaCorp टोलीले बनाएको सेवा हो। अहिले डेमो चरणमा छ, थप प्रश्न भए यही च्याटमा छोड्नुहोस्, हामी हेरेर सहयोग गर्नेछौं।"
   ]
  },
  "th": {
   "title": "ติดต่อ UNEXPOSED",
   "sub": "ตอบคำถามที่พบบ่อยได้ทันที",
   "ph": "พิมพ์คำถาม (เช่น ชำระเงิน, เข้าสู่ระบบ, สแกน...)",
   "send": "ส่ง",
   "close": "ปิด",
   "hello": "สวัสดี! ถามอะไรเกี่ยวกับ UNEXPOSED ก็ได้ — การสแกน การเข้าสู่ระบบ การชำระเงิน ผ้า ตู้เสื้อผ้า และอื่น ๆ (แชตบอต FAQ แบบใช้กฎ)",
   "fallback": "ขออภัย ยังไม่เข้าใจชัดเจน ลองกดคำถามแนะนำด้านล่าง หรือบอกอีกครั้งว่าอยากรู้เรื่องไหน: สแกน เข้าสู่ระบบ ชำระเงิน ผ้า หรือตู้เสื้อผ้า",
   "sug": [
    "สแกนยังไง?",
    "มีแพ็กเกจอะไรบ้าง?",
    "เข้าสู่ระบบ Google ไม่ได้",
    "รูปของฉันถูกเก็บไว้ไหม?"
   ],
   "a": [
    "กดปุ่ม \"เริ่มด้วยโหมด 3D\" หรือ \"เริ่มด้วยโหมด 2D\" ในส่วน scan demo เพื่อเริ่มสแกน เมื่ออนุญาตให้ใช้กล้องแล้ว คุณสามารถถ่ายรูปหรืออัดวิดีโอ 5 วินาทีได้ ถ้าใช้กล้องไม่ได้ ก็อัปโหลดไฟล์รูปหรือวิดีโอแทนได้",
    "เข้าสู่ระบบด้วยบัญชี Google เพื่อสมัครแพ็กเกจแบบชำระเงินหรือชำระเงิน ในเบราว์เซอร์ในแอปอย่าง KakaoTalk หรือแอป Claude นั้น Google จะบล็อกการเข้าสู่ระบบตามนโยบายความปลอดภัย กรุณากด \"เปิดในเบราว์เซอร์ภายนอก\" บนแบนเนอร์ด้านบนเพื่อเปิดใน Chrome หรือ Safari",
    "มี 2 แพ็กเกจ: รายเดือน 9,900 วอน และรายปี 109,800 วอน แพ็กเกจรายปีถูกกว่าการจ่ายรายเดือน 12 เดือน (118,800 วอน) 7.6% กด \"สมัครสมาชิก\" ในส่วนราคาเพื่อไปยังหน้าชำระเงิน",
    "เลือกระดับผ้า (เบสิก/พรีเมียม/สเปเชียล) ตัวเลือกรายละเอียด (ปัก ตัดพิเศษ) และรูปแบบสินค้า (แพทเทิร์น PDF / ส่งสินค้าสำเร็จรูป) เพื่อดูราคาผลิตโดยประมาณแบบเรียลไทม์ เลือก \"อื่น ๆ (คำขอเอง)\" เพื่อเขียนผ้าหรือดีไซน์ที่ต้องการได้อย่างอิสระ",
    "ใน \"ตู้เสื้อผ้าและการแต่งตัว\" บนหน้าจอสแกน คุณสามารถดูไอเทมพื้นฐาน รับคำแนะนำตามช่วงอายุและโอกาส หรืออัปโหลดเสื้อผ้าและเครื่องประดับที่ทำเอง (ไฟล์ .glb) มาลองใส่บนหุ่นได้",
    "กรอกส่วนสูง (ซม.) แล้วกด \"สร้างอวตาร\" หุ่น 3D จะปรับขนาดตามสัดส่วนนั้น ลากด้วยเมาส์หรือนิ้วเพื่อหมุนดูได้ 360 องศา",
    "ตอนนี้เป็นเวอร์ชันเดโม จึงยังไม่ได้เชื่อมต่อการผลิตและการจัดส่งจริง ในบริการจริง คุณจะส่งดีไซน์ที่เสร็จแล้วให้โรงงานพันธมิตรเป็นแพทเทิร์น (PDF) หรือเลือกรับเป็นสินค้าสำเร็จรูปได้",
    "ข้อมูลร่างกาย (รูป ส่วนสูง) จะถูกเก็บเฉพาะเมื่อคุณเข้าสู่ระบบและยินยอม \"การเก็บรวบรวมและจัดเก็บข้อมูลร่างกาย\" ด้วยตัวเองเท่านั้น หากไม่ยินยอม ข้อมูลจะแสดงบนหน้าจอเท่านั้นและไม่ถูกบันทึกบนเซิร์ฟเวอร์ และคุณเปลี่ยนความยินยอมหรือลบข้อมูลที่บันทึกไว้ได้ทุกเมื่อที่ \"ความยินยอมข้อมูลร่างกาย\" ในเมนูมุมซ้ายบน",
    "UNEXPOSED เป็นบริการที่สร้างโดยทีม PentaCorp ตอนนี้ยังอยู่ในขั้นเดโม หากมีคำถามเพิ่มเติม ฝากไว้ในแชตนี้ได้เลย เราจะตรวจสอบและช่วยเหลือ"
   ]
  },
  "fa": {
   "title": "تماس با UNEXPOSED",
   "sub": "پاسخ فوری به پرسش‌های پرتکرار",
   "ph": "سؤالت را بپرس (مثلاً: پرداخت، ورود، اسکن...)",
   "send": "ارسال",
   "close": "بستن",
   "hello": "سلام! هر سؤالی درباره UNEXPOSED داری بپرس — اسکن، ورود، پرداخت، پارچه، کمد لباس و غیره. (این یک چت‌بات پرسش‌های متداول مبتنی بر قاعده است)",
   "fallback": "ببخشید، کاملاً متوجه نشدم. یکی از سؤال‌های پیشنهادی پایین را بزن، یا دوباره بگو کدام بخش برایت سؤال است: اسکن، ورود، پرداخت، پارچه یا کمد لباس.",
   "sug": [
    "اسکن را چطور انجام دهم؟",
    "چه پلن‌هایی دارید؟",
    "ورود با گوگل کار نمی‌کند",
    "عکس‌هایم ذخیره می‌شوند؟"
   ],
   "a": [
    "با زدن دکمه «شروع در حالت سه‌بعدی» یا «شروع در حالت دوبعدی» در بخش scan demo اسکن شروع می‌شود. با اجازه دادن به دوربین می‌توانی عکس بگیری یا ویدیوی ۵ ثانیه‌ای ضبط کنی؛ اگر دوربین در دسترس نیست، می‌توانی فایل عکس یا ویدیو بارگذاری کنی.",
    "با حساب گوگل وارد شو تا بتوانی پلن پولی را مشترک شوی یا پرداخت کنی. در مرورگرهای داخل برنامه مثل KakaoTalk یا اپ Claude، گوگل به دلایل امنیتی ورود را مسدود می‌کند؛ پس «باز کردن در مرورگر خارجی» را در بنر بالای صفحه بزن و صفحه را در Chrome یا Safari باز کن.",
    "دو پلن وجود دارد: ماهانه ۹٬۹۰۰ وون و سالانه ۱۰۹٬۸۰۰ وون. پلن سالانه ۷٫۶٪ از پرداخت ماهانه برای ۱۲ ماه (۱۱۸٬۸۰۰ وون) ارزان‌تر است. در بخش قیمت‌ها «اشتراک» را بزن تا به صفحه پرداخت بروی.",
    "سطح پارچه (بیسیک/پریمیوم/اسپشال)، گزینه‌های جزئیات (گلدوزی، برش ویژه) و شکل نهایی (الگوی PDF / ارسال لباس آماده) را انتخاب کن تا تخمین هزینه تولید را همان لحظه ببینی. با انتخاب «سایر (درخواست دلخواه)» می‌توانی پارچه یا طرح موردنظرت را آزادانه بنویسی.",
    "در بخش «کمد و استایل» در صفحه اسکن می‌توانی آیتم‌های پیش‌فرض را ببینی، بر اساس سن و موقعیت پیشنهاد بگیری، یا لباس و اکسسوری ساخت خودت (فایل glb.) را بارگذاری کنی و روی مانکن امتحان کنی.",
    "قدت (سانتی‌متر) را وارد کن و «ساخت آواتار» را بزن تا اندازه مانکن سه‌بعدی به همان نسبت تنظیم شود. با موس یا انگشت بکش تا ۳۶۰ درجه بچرخد.",
    "این نسخه نمایشی است و تولید و ارسال واقعی هنوز متصل نشده‌اند. در سرویس اصلی می‌توانی طرح نهایی را به‌صورت الگو (PDF) به کارگاه همکار بفرستی یا دریافت لباس آماده را انتخاب کنی.",
    "داده‌های بدن (عکس، قد) فقط وقتی ذخیره می‌شوند که وارد شده باشی و خودت با «جمع‌آوری و نگهداری داده‌های بدن» موافقت کرده باشی. بدون موافقت فقط روی صفحه نمایش داده می‌شوند و در سرور ذخیره نمی‌شوند، و هر زمان می‌توانی از «رضایت داده‌های بدن» در منوی بالا سمت چپ رضایتت را تغییر دهی یا داده‌های ذخیره‌شده را حذف کنی.",
    "UNEXPOSED سرویسی است که تیم PentaCorp ساخته است. هنوز در مرحله نمایشی هستیم؛ اگر سؤال دیگری داری در همین چت بنویس تا بررسی کنیم و کمکت کنیم."
   ]
  },
  "sv": {
   "title": "Kontakta UNEXPOSED",
   "sub": "Snabba svar på vanliga frågor",
   "ph": "Ställ en fråga (t.ex. betalning, inloggning, skanning...)",
   "send": "Skicka",
   "close": "Stäng",
   "hello": "Hej! Fråga vad du vill om UNEXPOSED – skanning, inloggning, betalning, tyger, garderoben med mera. (Regelbaserad FAQ-chattbot)",
   "fallback": "Förlåt, jag förstod inte riktigt. Tryck på en av de föreslagna frågorna nedan, eller berätta igen vad du undrar över: skanning, inloggning, betalning, tyger eller garderoben.",
   "sug": [
    "Hur skannar jag?",
    "Vilka planer finns?",
    "Google-inloggningen fungerar inte",
    "Sparas mina foton?"
   ],
   "a": [
    "Skanningen startar när du trycker på knappen ”Starta i 3D” eller ”Starta i 2D” i avsnittet scan demo. Om du tillåter kameran kan du ta ett foto eller spela in en 5-sekundersvideo; kan du inte använda kameran går det bra att ladda upp en foto- eller videofil.",
    "Logga in med ditt Google-konto för att prenumerera på en betald plan eller betala. I inbyggda webbläsare som KakaoTalk eller Claude-appen blockerar Google inloggning av säkerhetsskäl – tryck på ”Öppna i extern webbläsare” i bannern högst upp och öppna sidan i Chrome eller Safari.",
    "Det finns två planer: månadsvis för 9 900 KRW och årsvis för 109 800 KRW. Årsplanen är 7,6 % billigare än att betala månadsvis i 12 månader (118 800 KRW). Tryck på ”Prenumerera” i prisavsnittet för att komma till betalningen.",
    "Välj tygnivå (Basic/Premium/Special), detaljalternativ (brodyr, specialskärning) och slutform (mönster-PDF / leverans av färdigt plagg) för att se en uppskattad produktionsoffert i realtid. Välj ”Annat (egen förfrågan)” för att fritt beskriva tyget eller designen du vill ha.",
    "Under ”Garderob & styling” på skanningsskärmen kan du bläddra bland standardplagg, få rekommendationer efter ålder och tillfälle, eller ladda upp egna kläder och accessoarer (.glb-filer) och prova dem på skyltdockan.",
    "Ange din längd (cm) och tryck på ”Skapa avatar” så anpassas 3D-dockan efter proportionerna. Dra med musen eller fingret för att rotera den 360 grader.",
    "Det här är en demoversion, så riktig tillverkning och leverans är inte kopplade än. I den färdiga tjänsten kan du skicka din design till en partnerverkstad som mönster (PDF) eller välja att få det färdiga plagget levererat.",
    "Kroppsdata (foton, längd) sparas bara om du loggar in och själv godkänner ”Insamling och lagring av kroppsdata”. Utan godkännande visas de bara på skärmen och sparas inte på servern, och du kan när som helst ändra ditt samtycke eller radera sparad data under ”Samtycke för kroppsdata” i menyn uppe till vänster.",
    "UNEXPOSED är en tjänst byggd av PentaCorp-teamet. Vi är fortfarande i demofasen – har du fler frågor, lämna dem i den här chatten så kollar vi och hjälper dig."
   ]
  },
  "bn": {
   "title": "UNEXPOSED-এ যোগাযোগ",
   "sub": "সাধারণ প্রশ্নের তাৎক্ষণিক উত্তর",
   "ph": "প্রশ্ন লিখুন (যেমন: পেমেন্ট, লগইন, স্ক্যান...)",
   "send": "পাঠান",
   "close": "বন্ধ করুন",
   "hello": "হ্যালো! UNEXPOSED সম্পর্কে যা খুশি জিজ্ঞেস করুন — স্ক্যান, লগইন, পেমেন্ট, কাপড়, ওয়ারড্রোব ইত্যাদি। (এটি নিয়মভিত্তিক FAQ চ্যাটবট)",
   "fallback": "দুঃখিত, ঠিক বুঝতে পারিনি। নিচের প্রস্তাবিত প্রশ্নগুলোর একটিতে চাপুন, অথবা আবার বলুন কোন বিষয়ে জানতে চান: স্ক্যান, লগইন, পেমেন্ট, কাপড় নাকি ওয়ারড্রোব।",
   "sug": [
    "স্ক্যান কীভাবে করব?",
    "কী কী প্ল্যান আছে?",
    "Google লগইন হচ্ছে না",
    "আমার ছবি কি সংরক্ষিত হয়?"
   ],
   "a": [
    "scan demo অংশে \"3D-তে শুরু করুন\" অথবা \"2D-তে শুরু করুন\" বোতাম চাপলে স্ক্যান শুরু হয়। ক্যামেরার অনুমতি দিলে ছবি তুলতে বা ৫ সেকেন্ডের ভিডিও রেকর্ড করতে পারবেন; ক্যামেরা ব্যবহার করতে না পারলে ছবি বা ভিডিও ফাইল আপলোডও করতে পারেন।",
    "Google অ্যাকাউন্ট দিয়ে লগইন করে পেইড প্ল্যানে সাবস্ক্রাইব বা পেমেন্ট করতে পারবেন। KakaoTalk বা Claude অ্যাপের মতো ইন-অ্যাপ ব্রাউজারে নিরাপত্তা নীতির কারণে Google লগইন আটকে দেয়, তাই উপরের ব্যানারে \"বহিরাগত ব্রাউজারে খুলুন\" চেপে Chrome বা Safari-তে খুলুন।",
    "দুটি প্ল্যান আছে: মাসিক ৯,৯০০ ওন এবং বার্ষিক ১,০৯,৮০০ ওন। বার্ষিক প্ল্যান ১২ মাস মাসিক দেওয়ার (১,১৮,৮০০ ওন) চেয়ে ৭.৬% সস্তা। মূল্য অংশে \"সাবস্ক্রাইব করুন\" চাপলে পেমেন্ট পেজে যাবেন।",
    "কাপড়ের স্তর (বেসিক/প্রিমিয়াম/স্পেশাল), বিবরণ বিকল্প (এমব্রয়ডারি, বিশেষ কাটিং) এবং চূড়ান্ত রূপ (প্যাটার্ন PDF / সম্পন্ন পোশাক ডেলিভারি) বেছে নিলে রিয়েল-টাইমে আনুমানিক উৎপাদন মূল্য দেখতে পাবেন। \"অন্যান্য (নিজের অনুরোধ)\" বেছে নিলে পছন্দের কাপড় বা ডিজাইন স্বাধীনভাবে লিখতে পারবেন।",
    "স্ক্যান স্ক্রিনের \"ওয়ারড্রোব ও সাজ\" অংশে ডিফল্ট আইটেম দেখতে, বয়স ও পরিস্থিতি অনুযায়ী সুপারিশ পেতে, অথবা নিজের তৈরি পোশাক ও গয়না (.glb ফাইল) আপলোড করে ম্যানিকিনে পরিয়ে দেখতে পারবেন।",
    "উচ্চতা (সেমি) লিখে \"অবতার তৈরি করুন\" চাপলে 3D ম্যানিকিনের আকার সেই অনুপাতে ঠিক হয়ে যায়। মাউস বা আঙুল দিয়ে টেনে ৩৬০ ডিগ্রি ঘুরিয়ে দেখতে পারবেন।",
    "এটি ডেমো সংস্করণ, তাই আসল উৎপাদন ও ডেলিভারি এখনও যুক্ত হয়নি। পূর্ণ সেবায় সম্পন্ন ডিজাইন প্যাটার্ন (PDF) হিসেবে পার্টনার কারখানায় পাঠাতে বা সম্পন্ন পোশাক হিসেবে পেতে বেছে নিতে পারবেন।",
    "শরীরের ডেটা (ছবি, উচ্চতা) কেবল লগইন করে নিজে \"শরীরের ডেটা সংগ্রহ ও সংরক্ষণ\"-এ সম্মতি দিলেই সংরক্ষিত হয়। সম্মতি না দিলে শুধু স্ক্রিনে দেখা যায়, সার্ভারে সংরক্ষিত হয় না; উপরে বাঁ দিকের মেনুর \"শরীরের ডেটা সম্মতি\"-তে যেকোনো সময় সম্মতি বদলাতে বা সংরক্ষিত ডেটা মুছতে পারবেন।",
    "UNEXPOSED হলো PentaCorp টিমের তৈরি একটি সেবা। এখন ডেমো পর্যায়ে আছে, আরও প্রশ্ন থাকলে এই চ্যাটে রেখে যান, আমরা দেখে সাহায্য করব।"
   ]
  },
  "id": {
   "title": "Hubungi UNEXPOSED",
   "sub": "Jawaban instan untuk pertanyaan umum",
   "ph": "Tanyakan sesuatu (mis. pembayaran, login, pindai...)",
   "send": "Kirim",
   "close": "Tutup",
   "hello": "Halo! Tanyakan apa saja tentang UNEXPOSED — pemindaian, login, pembayaran, kain, lemari, dan lainnya. (Ini chatbot FAQ berbasis aturan)",
   "fallback": "Maaf, saya kurang paham. Coba ketuk salah satu pertanyaan yang disarankan di bawah, atau sebutkan lagi bagian mana yang ingin kamu ketahui: pindai, login, pembayaran, kain, atau lemari.",
   "sug": [
    "Bagaimana cara memindai?",
    "Paketnya apa saja?",
    "Login Google tidak berhasil",
    "Apakah foto saya disimpan?"
   ],
   "a": [
    "Pemindaian dimulai dengan menekan tombol \"Mulai dalam 3D\" atau \"Mulai dalam 2D\" di bagian scan demo. Setelah mengizinkan akses kamera, kamu bisa memotret atau merekam video 5 detik; jika kamera tidak bisa dipakai, kamu juga bisa mengunggah file foto atau video.",
    "Masuk dengan akun Google untuk berlangganan paket berbayar atau melakukan pembayaran. Di browser dalam aplikasi seperti KakaoTalk atau aplikasi Claude, Google memblokir login karena kebijakan keamanan — ketuk \"Buka di browser eksternal\" pada banner di atas untuk membukanya di Chrome atau Safari.",
    "Ada dua paket: bulanan 9.900 won dan tahunan 109.800 won. Paket tahunan 7,6% lebih hemat dibanding membayar bulanan selama 12 bulan (118.800 won). Ketuk \"Berlangganan\" di bagian harga untuk menuju halaman pembayaran.",
    "Pilih tingkat kain (Basic/Premium/Special), opsi detail (bordir, potongan khusus), dan bentuk akhir (pola PDF / pengiriman produk jadi) untuk melihat perkiraan biaya produksi secara real-time. Pilih \"Lainnya (permintaan khusus)\" untuk menuliskan kain atau desain yang kamu inginkan dengan bebas.",
    "Di \"Lemari & Gaya\" pada layar pindai, kamu bisa melihat item bawaan, mendapat rekomendasi sesuai usia dan situasi, atau mengunggah pakaian dan aksesori buatan sendiri (file .glb) untuk dicoba pada manekin.",
    "Masukkan tinggi badan (cm) lalu ketuk \"Buat avatar\", ukuran manekin 3D akan disesuaikan dengan proporsi tersebut. Seret dengan mouse atau jari untuk memutarnya 360 derajat.",
    "Ini versi demo, jadi produksi dan pengiriman sungguhan belum terhubung. Pada layanan resmi, kamu bisa mengirim desain jadi ke bengkel mitra sebagai pola (PDF) atau memilih menerimanya sebagai produk jadi.",
    "Data tubuh (foto, tinggi) hanya disimpan jika kamu login dan menyetujui sendiri \"Pengumpulan & penyimpanan data tubuh\". Jika tidak setuju, data hanya tampil di layar dan tidak disimpan di server, dan kamu bisa mengubah persetujuan atau menghapus data tersimpan kapan saja di \"Persetujuan data tubuh\" pada menu kiri atas.",
    "UNEXPOSED adalah layanan buatan tim PentaCorp. Saat ini masih tahap demo, jadi jika ada pertanyaan lain, tinggalkan di chat ini dan kami akan memeriksa lalu membantu."
   ]
  },
  "tr": {
   "title": "UNEXPOSED'a ulaşın",
   "sub": "Sık sorulan sorulara anında yanıt",
   "ph": "Bir soru sor (örn. ödeme, giriş, tarama...)",
   "send": "Gönder",
   "close": "Kapat",
   "hello": "Merhaba! UNEXPOSED hakkında her şeyi sorabilirsin — tarama, giriş, ödeme, kumaşlar, gardırop ve daha fazlası. (Kural tabanlı SSS sohbet botu)",
   "fallback": "Üzgünüm, tam anlayamadım. Aşağıdaki önerilen sorulardan birine dokun ya da hangi konuyu merak ettiğini tekrar söyle: tarama, giriş, ödeme, kumaş veya gardırop.",
   "sug": [
    "Tarama nasıl yapılır?",
    "Planlar neler?",
    "Google ile giriş yapamıyorum",
    "Fotoğraflarım saklanıyor mu?"
   ],
   "a": [
    "Tarama, scan demo bölümündeki \"3D ile başla\" veya \"2D ile başla\" düğmesine basınca başlar. Kamera iznini verirsen fotoğraf çekebilir veya 5 saniyelik video kaydedebilirsin; kamerayı kullanamıyorsan fotoğraf ya da video dosyası da yükleyebilirsin.",
    "Ücretli plana abone olmak veya ödeme yapmak için Google hesabınla giriş yap. KakaoTalk ya da Claude uygulaması gibi uygulama içi tarayıcılarda Google, güvenlik politikası gereği girişi engeller; üstteki banner'da \"Harici tarayıcıda aç\"a dokunarak sayfayı Chrome veya Safari'de aç.",
    "İki plan var: aylık 9.900 won ve yıllık 109.800 won. Yıllık plan, 12 ay boyunca aylık ödemeye (118.800 won) göre %7,6 daha ucuz. Ödeme sayfasına gitmek için fiyatlar bölümünde \"Abone ol\" düğmesine dokun.",
    "Kumaş katmanını (Basic/Premium/Special), detay seçeneklerini (nakış, özel kesim) ve bitmiş formu (kalıp PDF / bitmiş ürün teslimatı) seçerek tahmini üretim teklifini anında görebilirsin. \"Diğer (özel istek)\" seçeneğiyle istediğin kumaşı veya tasarımı serbestçe yazabilirsin.",
    "Tarama ekranındaki \"Gardırop ve Stil\" bölümünde varsayılan ürünlere göz atabilir, yaş ve duruma göre öneri alabilir ya da kendi yaptığın kıyafet ve aksesuarları (.glb dosyaları) yükleyip mankende deneyebilirsin.",
    "Boyunu (cm) girip \"Avatar oluştur\"a dokunduğunda 3D manken o orana göre boyutlanır. Fare veya parmağınla sürükleyerek 360 derece döndürebilirsin.",
    "Bu bir demo sürümü olduğundan gerçek üretim ve teslimat henüz bağlı değil. Resmî hizmette tamamlanan tasarımını kalıp (PDF) olarak iş ortağı atölyeye gönderebilecek ya da bitmiş ürün olarak teslim almayı seçebileceksin.",
    "Beden verileri (fotoğraf, boy) yalnızca giriş yapıp \"Beden verisi toplama ve saklama\"ya kendin onay verirsen saklanır. Onay vermezsen yalnızca ekranda gösterilir, sunucuya kaydedilmez; sol üstteki menüde \"Beden verisi onayı\" bölümünden onayını istediğin zaman değiştirebilir veya kayıtlı verileri silebilirsin.",
    "UNEXPOSED, PentaCorp ekibinin geliştirdiği bir hizmettir. Henüz demo aşamasındayız; başka sorun varsa bu sohbete bırak, kontrol edip yardımcı olalım."
   ]
  },
  "nl": {
   "title": "Contact met UNEXPOSED",
   "sub": "Direct antwoord op veelgestelde vragen",
   "ph": "Stel een vraag (bijv. betaling, inloggen, scan...)",
   "send": "Versturen",
   "close": "Sluiten",
   "hello": "Hallo! Vraag me alles over UNEXPOSED – scannen, inloggen, betalen, stoffen, de kledingkast en meer. (Regelgebaseerde FAQ-chatbot)",
   "fallback": "Sorry, dat begreep ik niet helemaal. Tik op een van de voorgestelde vragen hieronder, of vertel nog eens waar je meer over wilt weten: scannen, inloggen, betalen, stoffen of kledingkast.",
   "sug": [
    "Hoe werkt het scannen?",
    "Welke abonnementen zijn er?",
    "Inloggen met Google lukt niet",
    "Worden mijn foto’s bewaard?"
   ],
   "a": [
    "Het scannen begint wanneer je in het onderdeel scan demo op \"Starten in 3D\" of \"Starten in 2D\" tikt. Als je cameratoegang geeft, kun je een foto maken of een video van 5 seconden opnemen; kun je de camera niet gebruiken, dan kun je ook een foto- of videobestand uploaden.",
    "Log in met je Google-account om een betaald abonnement te nemen of te betalen. In in-app-browsers zoals KakaoTalk of de Claude-app blokkeert Google het inloggen om veiligheidsredenen – tik in de banner bovenaan op \"Openen in externe browser\" en open de pagina in Chrome of Safari.",
    "Er zijn twee abonnementen: maandelijks voor 9.900 KRW en jaarlijks voor 109.800 KRW. Het jaarabonnement is 7,6% goedkoper dan 12 maanden maandelijks betalen (118.800 KRW). Tik in het prijsgedeelte op \"Abonneren\" om naar de betaalpagina te gaan.",
    "Kies het stofniveau (Basic/Premium/Special), detailopties (borduurwerk, speciale snit) en de eindvorm (patroon-pdf / levering van het afgewerkte kledingstuk) om direct een geschatte productieofferte te zien. Met \"Anders (eigen verzoek)\" kun je vrij beschrijven welke stof of welk ontwerp je wilt.",
    "Bij \"Kledingkast & styling\" op het scanscherm kun je standaarditems bekijken, aanbevelingen krijgen per leeftijd en gelegenheid, of je eigen kleding en accessoires (.glb-bestanden) uploaden en op de paspop passen.",
    "Vul je lengte (cm) in en tik op \"Avatar maken\" – de 3D-paspop wordt op die verhoudingen aangepast. Sleep met je muis of vinger om hem 360 graden te draaien.",
    "Dit is een demoversie, dus echte productie en levering zijn nog niet gekoppeld. In de definitieve dienst kun je je ontwerp als patroon (pdf) naar een partneratelier sturen of kiezen om het afgewerkte kledingstuk te ontvangen.",
    "Lichaamsgegevens (foto’s, lengte) worden alleen bewaard als je inlogt en zelf akkoord gaat met \"Verzamelen en bewaren van lichaamsgegevens\". Zonder toestemming worden ze alleen op het scherm getoond en niet op de server opgeslagen, en je kunt je toestemming altijd wijzigen of opgeslagen gegevens verwijderen via \"Toestemming lichaamsgegevens\" in het menu linksboven.",
    "UNEXPOSED is een dienst van het PentaCorp-team. We zitten nog in de demofase – heb je nog vragen, laat ze achter in deze chat en we helpen je na controle verder."
   ]
  },
  "hi": {
   "title": "UNEXPOSED से संपर्क करें",
   "sub": "अक्सर पूछे जाने वाले सवालों के तुरंत जवाब",
   "ph": "सवाल पूछें (जैसे: भुगतान, लॉगिन, स्कैन...)",
   "send": "भेजें",
   "close": "बंद करें",
   "hello": "नमस्ते! UNEXPOSED के बारे में कुछ भी पूछें — स्कैन, लॉगिन, भुगतान, कपड़ा, वॉर्डरोब वगैरह। (यह नियम-आधारित FAQ चैटबॉट है)",
   "fallback": "माफ़ कीजिए, मैं ठीक से समझ नहीं पाया। नीचे दिए सुझाए गए सवालों में से एक दबाएँ, या फिर बताएँ कि स्कैन, लॉगिन, भुगतान, कपड़ा या वॉर्डरोब में से किस बारे में जानना चाहते हैं।",
   "sug": [
    "स्कैन कैसे करें?",
    "कौन-कौन से प्लान हैं?",
    "Google लॉगिन नहीं हो रहा",
    "क्या मेरी फ़ोटो सेव होती है?"
   ],
   "a": [
    "scan demo सेक्शन में \"3D में शुरू करें\" या \"2D में शुरू करें\" बटन दबाने से स्कैन शुरू होता है। कैमरा की अनुमति देने पर आप फ़ोटो ले सकते हैं या 5 सेकंड का वीडियो रिकॉर्ड कर सकते हैं; कैमरा इस्तेमाल न हो सके तो फ़ोटो या वीडियो फ़ाइल अपलोड भी कर सकते हैं।",
    "Google खाते से लॉगिन करके सशुल्क प्लान की सदस्यता ले सकते हैं या भुगतान कर सकते हैं। KakaoTalk या Claude ऐप जैसे इन-ऐप ब्राउज़र में Google सुरक्षा नीति के कारण लॉगिन रोक देता है, इसलिए ऊपर बैनर में \"बाहरी ब्राउज़र में खोलें\" दबाकर Chrome या Safari में खोलें।",
    "दो प्लान हैं: मासिक 9,900 वॉन और वार्षिक 1,09,800 वॉन। वार्षिक प्लान 12 महीने मासिक भुगतान (1,18,800 वॉन) से 7.6% सस्ता है। मूल्य सेक्शन में \"सदस्यता लें\" दबाने पर भुगतान पेज खुलता है।",
    "कपड़े का स्तर (बेसिक/प्रीमियम/स्पेशल), डिटेल विकल्प (कढ़ाई, खास कटिंग) और अंतिम रूप (पैटर्न PDF / तैयार कपड़े की डिलीवरी) चुनकर रीयल-टाइम में अनुमानित उत्पादन मूल्य देख सकते हैं। \"अन्य (अपना अनुरोध)\" चुनने पर मनचाहा कपड़ा या डिज़ाइन खुलकर लिख सकते हैं।",
    "स्कैन स्क्रीन के \"वॉर्डरोब और स्टाइलिंग\" में डिफ़ॉल्ट आइटम देख सकते हैं, उम्र और मौके के हिसाब से सुझाव पा सकते हैं, या खुद के बनाए कपड़े और एक्सेसरी (.glb फ़ाइल) अपलोड करके पुतले पर पहनाकर देख सकते हैं।",
    "ऊंचाई (सेमी) डालकर \"अवतार बनाएं\" दबाएँ, 3D पुतले का आकार उसी अनुपात में बदल जाएगा। माउस या उंगली से खींचकर 360 डिग्री घुमा सकते हैं।",
    "यह डेमो संस्करण है, इसलिए असली उत्पादन और डिलीवरी अभी जुड़ी नहीं है। पूर्ण सेवा में आप तैयार डिज़ाइन को पैटर्न (PDF) के रूप में पार्टनर वर्कशॉप को भेज सकेंगे या तैयार कपड़ा पाने का विकल्प चुन सकेंगे।",
    "शरीर का डेटा (फ़ोटो, ऊंचाई) तभी सेव होता है जब आप लॉगिन करके खुद \"शरीर डेटा संग्रह और भंडारण\" के लिए सहमति देते हैं। सहमति न देने पर यह सिर्फ़ स्क्रीन पर दिखता है और सर्वर पर सेव नहीं होता; ऊपर बाईं ओर के मेनू में \"शरीर डेटा सहमति\" से कभी भी सहमति बदल सकते हैं या सेव डेटा मिटा सकते हैं।",
    "UNEXPOSED, PentaCorp टीम द्वारा बनाई गई सेवा है। अभी यह डेमो चरण में है, इसलिए और सवाल हों तो इसी चैट में छोड़ दें, हम देखकर मदद करेंगे।"
   ]
  },
  "pt": {
   "title": "Fale com a UNEXPOSED",
   "sub": "Respostas imediatas às perguntas frequentes",
   "ph": "Faça uma pergunta (ex.: pagamento, login, escaneamento...)",
   "send": "Enviar",
   "close": "Fechar",
   "hello": "Olá! Pergunte o que quiser sobre a UNEXPOSED — escaneamento, login, pagamento, tecidos, guarda-roupa e mais. (Chatbot de FAQ baseado em regras)",
   "fallback": "Desculpe, não entendi bem. Toque em uma das perguntas sugeridas abaixo ou diga de novo o que você quer saber: escaneamento, login, pagamento, tecidos ou guarda-roupa.",
   "sug": [
    "Como faço o escaneamento?",
    "Quais são os planos?",
    "O login com Google não funciona",
    "Minhas fotos ficam salvas?"
   ],
   "a": [
    "O escaneamento começa ao tocar no botão \"Começar em 3D\" ou \"Começar em 2D\" na seção scan demo. Ao permitir o acesso à câmera, você pode tirar uma foto ou gravar um vídeo de 5 segundos; se não puder usar a câmera, também pode enviar um arquivo de foto ou vídeo.",
    "Entre com sua conta Google para assinar um plano pago ou fazer um pagamento. Em navegadores dentro de apps, como o KakaoTalk ou o app do Claude, o Google bloqueia o login por segurança — toque em \"Abrir em navegador externo\" no banner no topo e abra a página no Chrome ou Safari.",
    "Há dois planos: mensal por 9.900 wons e anual por 109.800 wons. O plano anual sai 7,6% mais barato do que pagar 12 meses no mensal (118.800 wons). Toque em \"Assinar\" na seção de preços para ir à página de pagamento.",
    "Escolha o nível de tecido (Basic/Premium/Special), as opções de detalhe (bordado, corte especial) e a forma final (molde em PDF / entrega da peça pronta) para ver um orçamento estimado de produção em tempo real. Em \"Outro (pedido personalizado)\" você pode descrever livremente o tecido ou o design que deseja.",
    "Em \"Guarda-roupa e estilo\", na tela de escaneamento, você pode ver os itens padrão, receber recomendações por faixa etária e ocasião, ou enviar suas próprias roupas e acessórios (arquivos .glb) para experimentar no manequim.",
    "Digite sua altura (cm) e toque em \"Criar avatar\" — o manequim 3D é ajustado a essa proporção. Arraste com o mouse ou o dedo para girá-lo 360 graus.",
    "Esta é uma versão de demonstração, então a produção e a entrega reais ainda não estão conectadas. No serviço oficial, você poderá enviar seu design a um ateliê parceiro como molde (PDF) ou escolher receber a peça pronta.",
    "Os dados corporais (fotos, altura) só são salvos se você fizer login e concordar por conta própria com a \"Coleta e armazenamento de dados corporais\". Sem o consentimento, eles aparecem apenas na tela e não são salvos no servidor, e você pode alterar o consentimento ou excluir os dados salvos a qualquer momento em \"Consentimento de dados corporais\" no menu superior esquerdo.",
    "A UNEXPOSED é um serviço criado pela equipe PentaCorp. Ainda estamos em fase de demonstração; se tiver mais dúvidas, deixe neste chat e vamos verificar e ajudar."
   ]
  },
  "it": {
   "title": "Contatta UNEXPOSED",
   "sub": "Risposte immediate alle domande frequenti",
   "ph": "Fai una domanda (es. pagamento, accesso, scansione...)",
   "send": "Invia",
   "close": "Chiudi",
   "hello": "Ciao! Chiedimi qualsiasi cosa su UNEXPOSED — scansione, accesso, pagamento, tessuti, armadio e altro. (Chatbot FAQ basato su regole)",
   "fallback": "Scusa, non ho capito bene. Tocca una delle domande suggerite qui sotto, oppure dimmi di nuovo cosa ti interessa: scansione, accesso, pagamento, tessuti o armadio.",
   "sug": [
    "Come si fa la scansione?",
    "Quali sono i piani?",
    "Non riesco ad accedere con Google",
    "Le mie foto vengono salvate?"
   ],
   "a": [
    "La scansione parte toccando il pulsante \"Inizia in 3D\" o \"Inizia in 2D\" nella sezione scan demo. Consentendo l’accesso alla fotocamera puoi scattare una foto o registrare un video di 5 secondi; se non puoi usare la fotocamera, puoi anche caricare un file foto o video.",
    "Accedi con il tuo account Google per abbonarti a un piano a pagamento o pagare. Nei browser integrati nelle app, come KakaoTalk o l’app Claude, Google blocca l’accesso per motivi di sicurezza: tocca \"Apri nel browser esterno\" nel banner in alto e apri la pagina in Chrome o Safari.",
    "Ci sono due piani: mensile a 9.900 won e annuale a 109.800 won. Il piano annuale costa l’7,6% in meno rispetto a 12 mesi di mensile (118.800 won). Tocca \"Abbonati\" nella sezione prezzi per andare alla pagina di pagamento.",
    "Scegli il livello di tessuto (Basic/Premium/Special), le opzioni di dettaglio (ricamo, taglio speciale) e la forma finale (cartamodello PDF / consegna del capo finito) per vedere in tempo reale un preventivo di produzione stimato. Con \"Altro (richiesta personalizzata)\" puoi descrivere liberamente il tessuto o il design che desideri.",
    "In \"Armadio e stile\", nella schermata di scansione, puoi sfogliare gli articoli predefiniti, ricevere consigli per fascia d’età e occasione, oppure caricare vestiti e accessori creati da te (file .glb) e provarli sul manichino.",
    "Inserisci la tua altezza (cm) e tocca \"Crea avatar\": il manichino 3D si adatta a quelle proporzioni. Trascina con il mouse o con il dito per ruotarlo di 360 gradi.",
    "Questa è una versione demo, quindi produzione e consegna reali non sono ancora collegate. Nel servizio definitivo potrai inviare il tuo design a un laboratorio partner come cartamodello (PDF) oppure scegliere di ricevere il capo finito.",
    "I dati corporei (foto, altezza) vengono salvati solo se accedi e acconsenti tu stesso alla \"Raccolta e conservazione dei dati corporei\". Senza consenso vengono solo mostrati sullo schermo e non salvati sul server, e puoi modificare il consenso o eliminare i dati salvati in qualsiasi momento da \"Consenso dati corporei\" nel menu in alto a sinistra.",
    "UNEXPOSED è un servizio creato dal team PentaCorp. Siamo ancora in fase demo: se hai altre domande, lasciale in questa chat e ti aiuteremo dopo averle verificate."
   ]
  },
  "es": {
   "title": "Contacta con UNEXPOSED",
   "sub": "Respuestas inmediatas a las preguntas frecuentes",
   "ph": "Haz una pregunta (p. ej.: pago, inicio de sesión, escaneo...)",
   "send": "Enviar",
   "close": "Cerrar",
   "hello": "¡Hola! Pregúntame lo que quieras sobre UNEXPOSED: escaneo, inicio de sesión, pago, telas, armario y más. (Chatbot de preguntas frecuentes basado en reglas)",
   "fallback": "Lo siento, no lo he entendido bien. Toca una de las preguntas sugeridas abajo o dime de nuevo qué te interesa: escaneo, inicio de sesión, pago, telas o armario.",
   "sug": [
    "¿Cómo hago el escaneo?",
    "¿Qué planes hay?",
    "No puedo iniciar sesión con Google",
    "¿Se guardan mis fotos?"
   ],
   "a": [
    "El escaneo empieza al tocar el botón \"Empezar en 3D\" o \"Empezar en 2D\" en la sección scan demo. Si permites el acceso a la cámara, puedes hacer una foto o grabar un vídeo de 5 segundos; si no puedes usar la cámara, también puedes subir un archivo de foto o vídeo.",
    "Inicia sesión con tu cuenta de Google para suscribirte a un plan de pago o pagar. En navegadores integrados en apps como KakaoTalk o la app de Claude, Google bloquea el inicio de sesión por seguridad: toca \"Abrir en navegador externo\" en el banner superior y abre la página en Chrome o Safari.",
    "Hay dos planes: mensual por 9.900 wones y anual por 109.800 wones. El plan anual es un 7,6 % más barato que pagar 12 meses en mensual (118.800 wones). Toca \"Suscribirse\" en la sección de precios para ir a la página de pago.",
    "Elige el nivel de tela (Basic/Premium/Special), las opciones de detalle (bordado, corte especial) y la forma final (patrón en PDF / entrega de la prenda terminada) para ver en tiempo real un presupuesto estimado de producción. Con \"Otro (petición personalizada)\" puedes describir libremente la tela o el diseño que quieres.",
    "En \"Armario y estilo\", dentro de la pantalla de escaneo, puedes ver los artículos predeterminados, recibir recomendaciones según edad y ocasión, o subir tu propia ropa y accesorios (archivos .glb) para probarlos en el maniquí.",
    "Introduce tu estatura (cm) y toca \"Crear avatar\": el maniquí 3D se ajusta a esas proporciones. Arrastra con el ratón o el dedo para girarlo 360 grados.",
    "Esta es una versión de demostración, así que la producción y el envío reales aún no están conectados. En el servicio oficial podrás enviar tu diseño a un taller asociado como patrón (PDF) o elegir recibir la prenda terminada.",
    "Los datos corporales (fotos, estatura) solo se guardan si inicias sesión y aceptas tú mismo la \"Recogida y conservación de datos corporales\". Sin tu consentimiento solo se muestran en pantalla y no se guardan en el servidor, y puedes cambiar tu consentimiento o borrar los datos guardados en cualquier momento desde \"Consentimiento de datos corporales\" en el menú superior izquierdo.",
    "UNEXPOSED es un servicio creado por el equipo de PentaCorp. Todavía estamos en fase de demostración; si tienes más dudas, déjalas en este chat y te ayudaremos tras revisarlas."
   ]
  },
  "pl": {
   "title": "Kontakt z UNEXPOSED",
   "sub": "Natychmiastowe odpowiedzi na częste pytania",
   "ph": "Zadaj pytanie (np. płatność, logowanie, skanowanie...)",
   "send": "Wyślij",
   "close": "Zamknij",
   "hello": "Cześć! Zapytaj o wszystko, co dotyczy UNEXPOSED — skanowanie, logowanie, płatności, tkaniny, szafę i nie tylko. (Chatbot FAQ oparty na regułach)",
   "fallback": "Przepraszam, nie do końca zrozumiałem. Dotknij jednego z sugerowanych pytań poniżej albo powiedz jeszcze raz, co cię interesuje: skanowanie, logowanie, płatność, tkaniny czy szafa.",
   "sug": [
    "Jak zrobić skanowanie?",
    "Jakie są plany?",
    "Logowanie przez Google nie działa",
    "Czy moje zdjęcia są zapisywane?"
   ],
   "a": [
    "Skanowanie zaczyna się po naciśnięciu przycisku „Zacznij w 3D” lub „Zacznij w 2D” w sekcji scan demo. Po zezwoleniu na dostęp do kamery możesz zrobić zdjęcie lub nagrać 5-sekundowy film; jeśli nie możesz użyć kamery, możesz też przesłać plik ze zdjęciem lub filmem.",
    "Zaloguj się kontem Google, aby wykupić płatny plan lub zapłacić. W przeglądarkach wbudowanych w aplikacje, takich jak KakaoTalk czy aplikacja Claude, Google blokuje logowanie ze względów bezpieczeństwa — dotknij „Otwórz w zewnętrznej przeglądarce” na banerze u góry i otwórz stronę w Chrome lub Safari.",
    "Są dwa plany: miesięczny za 9 900 wonów i roczny za 109 800 wonów. Plan roczny jest o 7,6% tańszy niż 12 miesięcy płatności miesięcznej (118 800 wonów). Dotknij „Subskrybuj” w sekcji cennika, aby przejść do płatności.",
    "Wybierz poziom tkaniny (Basic/Premium/Special), opcje detali (haft, specjalny krój) i formę końcową (wykrój PDF / dostawa gotowego ubrania), aby na bieżąco zobaczyć szacowaną wycenę produkcji. Wybierając „Inne (własna prośba)”, możesz swobodnie opisać tkaninę lub projekt, jakiego chcesz.",
    "W sekcji „Szafa i stylizacja” na ekranie skanowania możesz przeglądać podstawowe elementy, otrzymywać rekomendacje według wieku i okazji albo przesłać własne ubrania i dodatki (pliki .glb) i przymierzyć je na manekinie.",
    "Wpisz swój wzrost (cm) i dotknij „Utwórz awatara” — manekin 3D dopasuje się do tych proporcji. Przeciągnij myszką lub palcem, aby obrócić go o 360 stopni.",
    "To wersja demonstracyjna, więc prawdziwa produkcja i dostawa nie są jeszcze podłączone. W docelowej usłudze będziesz mógł przekazać gotowy projekt do warsztatu partnerskiego jako wykrój (PDF) lub wybrać odbiór gotowego ubrania.",
    "Dane ciała (zdjęcia, wzrost) są zapisywane tylko wtedy, gdy się zalogujesz i samodzielnie wyrazisz zgodę na „Zbieranie i przechowywanie danych ciała”. Bez zgody są tylko wyświetlane na ekranie i nie trafiają na serwer, a zgodę możesz w każdej chwili zmienić lub usunąć zapisane dane w pozycji „Zgoda na dane ciała” w menu w lewym górnym rogu.",
    "UNEXPOSED to usługa stworzona przez zespół PentaCorp. Wciąż jesteśmy na etapie demo — jeśli masz więcej pytań, zostaw je w tym czacie, a sprawdzimy i pomożemy."
   ]
  }
 },
 "kw": [
  [
   "스캔",
   "카메라",
   "촬영",
   "녹화",
   "scan",
   "camera",
   "video",
   "скан",
   "камер",
   "видео",
   "扫描",
   "相机",
   "拍照",
   "视频",
   "スキャン",
   "カメラ",
   "撮影",
   "動画",
   "caméra",
   "vidéo",
   "kamera",
   "مسح",
   "كاميرا",
   "فيديو",
   "quét",
   "máy ảnh",
   "स्क्यान",
   "क्यामेरा",
   "สแกน",
   "กล้อง",
   "اسکن",
   "دوربین",
   "skann",
   "স্ক্যান",
   "ক্যামেরা",
   "pindai",
   "memindai",
   "tarama",
   "scannen",
   "स्कैन",
   "कैमरा",
   "escane",
   "câmera",
   "cámara",
   "scansion",
   "fotocamera",
   "skanow"
  ],
  [
   "로그인",
   "구글",
   "인앱",
   "카카오톡",
   "403",
   "disallowed",
   "login",
   "log in",
   "sign in",
   "sign-in",
   "google",
   "kakao",
   "вход",
   "войти",
   "гугл",
   "登录",
   "ログイン",
   "connexion",
   "connecter",
   "anmeld",
   "einlog",
   "تسجيل الدخول",
   "الدخول",
   "جوجل",
   "غوغل",
   "đăng nhập",
   "लगइन",
   "लॉगिन",
   "เข้าสู่ระบบ",
   "ล็อกอิน",
   "ورود",
   "گوگل",
   "logga in",
   "inlogg",
   "লগইন",
   "masuk",
   "giriş",
   "inloggen",
   "iniciar sesión",
   "accesso",
   "accedere",
   "logowan",
   "zaloguj"
  ],
  [
   "결제",
   "구독",
   "돈",
   "카드",
   "토스",
   "요금",
   "가격",
   "플랜",
   "pay",
   "subscri",
   "money",
   "card",
   "price",
   "plan",
   "charge",
   "cost",
   "оплат",
   "подписк",
   "деньг",
   "карт",
   "цен",
   "тариф",
   "спиш",
   "付款",
   "订阅",
   "扣钱",
   "价格",
   "套餐",
   "支付",
   "決済",
   "購読",
   "お金",
   "カード",
   "料金",
   "プラン",
   "paiement",
   "abonn",
   "argent",
   "carte",
   "prix",
   "tarif",
   "débit",
   "zahl",
   "geld",
   "karte",
   "preis",
   "abgebucht",
   "دفع",
   "اشتراك",
   "مال",
   "بطاقة",
   "سعر",
   "خطة",
   "يُخصم",
   "thanh toán",
   "đăng ký",
   "tiền",
   "thẻ",
   "giá",
   "gói",
   "भुक्तानी",
   "पैसा",
   "कार्ड",
   "मूल्य",
   "योजना",
   "ชำระ",
   "จ่าย",
   "สมัคร",
   "เงิน",
   "บัตร",
   "ราคา",
   "แพ็กเกจ",
   "پرداخت",
   "اشتراک",
   "پول",
   "کارت",
   "قیمت",
   "پلن",
   "betal",
   "prenumer",
   "pengar",
   "pris",
   "dras",
   "পেমেন্ট",
   "টাকা",
   "কার্ড",
   "প্ল্যান",
   "bayar",
   "langganan",
   "uang",
   "kartu",
   "harga",
   "ödeme",
   "abone",
   "para",
   "fiyat",
   "paket",
   "abonnement",
   "formule",
   "piani",
   "planes",
   "tarifs",
   "afgeschreven",
   "prijs",
   "भुगतान",
   "पैसे",
   "कीमत",
   "प्लान",
   "pagamento",
   "assinatura",
   "dinheiro",
   "cartão",
   "preço",
   "cobrad",
   "pago",
   "suscrip",
   "dinero",
   "tarjeta",
   "precio",
   "cobrar",
   "abbonam",
   "soldi",
   "prezz",
   "addebit",
   "płatnoś",
   "płac",
   "subskryp",
   "pieniądz",
   "cen"
  ],
  [
   "원단",
   "소재",
   "디테일",
   "견적",
   "제작비",
   "fabric",
   "material",
   "detail",
   "quote",
   "estimate",
   "ткан",
   "материал",
   "детал",
   "смет",
   "面料",
   "材质",
   "细节",
   "报价",
   "生地",
   "素材",
   "ディテール",
   "見積",
   "tissu",
   "matière",
   "devis",
   "stoff",
   "angebot",
   "قماش",
   "خامة",
   "تفاصيل",
   "vải",
   "chất liệu",
   "báo giá",
   "कपडा",
   "कपड़ा",
   "सामग्री",
   "ผ้า",
   "วัสดุ",
   "پارچه",
   "tyg",
   "কাপড়",
   "kain",
   "bahan",
   "kumaş",
   "tecido",
   "tela",
   "tessut",
   "tkanin",
   "materiał"
  ],
  [
   "옷장",
   "입혀",
   "꾸미기",
   "장신구",
   "아이템",
   "추천",
   "wardrobe",
   "closet",
   "accessor",
   "recommend",
   "try on",
   "гардероб",
   "аксессуар",
   "рекоменд",
   "衣柜",
   "配饰",
   "推荐",
   "クローゼット",
   "アクセサリー",
   "おすすめ",
   "garde-robe",
   "accessoire",
   "kleiderschrank",
   "خزانة",
   "إكسسوار",
   "tủ đồ",
   "phụ kiện",
   "वार्डरोब",
   "वॉर्डरोब",
   "ตู้เสื้อผ้า",
   "เครื่องประดับ",
   "کمد",
   "اکسسوری",
   "garderob",
   "ওয়ারড্রোব",
   "lemari",
   "aksesori",
   "gardırop",
   "aksesuar",
   "kledingkast",
   "guarda-roupa",
   "armario",
   "armadio",
   "szaf",
   "glb"
  ],
  [
   "마네킹",
   "키",
   "아바타",
   "3d",
   "전신",
   "mannequin",
   "avatar",
   "height",
   "манекен",
   "аватар",
   "рост",
   "人台",
   "虚拟形象",
   "身高",
   "マネキン",
   "アバター",
   "身長",
   "größe",
   "مانيكان",
   "الصورة الرمزية",
   "طول",
   "ma-nơ-canh",
   "chiều cao",
   "अवतार",
   "उचाइ",
   "ऊंचाई",
   "पुतल",
   "หุ่น",
   "อวตาร",
   "ส่วนสูง",
   "مانکن",
   "آواتار",
   "längd",
   "skyltdocka",
   "অবতার",
   "উচ্চতা",
   "ম্যানিকিন",
   "manekin",
   "tinggi",
   "manken",
   "paspop",
   "lengte",
   "manequim",
   "altura",
   "maniquí",
   "estatura",
   "manichino",
   "altezza",
   "wzrost"
  ],
  [
   "제작",
   "배송",
   "실제",
   "받을",
   "완제품",
   "기간",
   "production",
   "deliver",
   "shipping",
   "how long",
   "производ",
   "доставк",
   "制作",
   "配送",
   "成品",
   "製作",
   "完成品",
   "fabrication",
   "livraison",
   "produktion",
   "lieferung",
   "versand",
   "تصنيع",
   "توصيل",
   "شحن",
   "sản xuất",
   "giao hàng",
   "उत्पादन",
   "डेलिभरी",
   "डिलीवरी",
   "ผลิต",
   "จัดส่ง",
   "تولید",
   "ارسال",
   "tillverkning",
   "leverans",
   "উৎপাদন",
   "ডেলিভারি",
   "produksi",
   "pengiriman",
   "üretim",
   "teslimat",
   "kargo",
   "productie",
   "levering",
   "verzend",
   "produção",
   "entrega",
   "envio",
   "producción",
   "envío",
   "produzione",
   "consegna",
   "spedizione",
   "produkcj",
   "dostaw",
   "wysyłk"
  ],
  [
   "개인정보",
   "사진",
   "저장",
   "삭제",
   "동의",
   "프라이버시",
   "privacy",
   "photo",
   "stored",
   "save",
   "delete",
   "consent",
   "конфиденц",
   "фото",
   "сохран",
   "удал",
   "соглас",
   "隐私",
   "照片",
   "保存",
   "删除",
   "同意",
   "プライバシー",
   "写真",
   "削除",
   "confidential",
   "conserv",
   "supprim",
   "consentement",
   "datenschutz",
   "foto",
   "gespeichert",
   "lösch",
   "zustimm",
   "خصوصية",
   "صور",
   "حفظ",
   "حذف",
   "موافقة",
   "riêng tư",
   "ảnh",
   "lưu",
   "xóa",
   "đồng ý",
   "गोपनीयता",
   "फोटो",
   "फ़ोटो",
   "सेव",
   "सहमति",
   "ความเป็นส่วนตัว",
   "รูป",
   "เก็บ",
   "ยินยอม",
   "حریم",
   "عکس",
   "ذخیره",
   "رضایت",
   "integritet",
   "sparas",
   "radera",
   "samtycke",
   "গোপনীয়তা",
   "ছবি",
   "সংরক্ষ",
   "সম্মতি",
   "privasi",
   "simpan",
   "hapus",
   "persetujuan",
   "gizlilik",
   "fotoğraf",
   "sakla",
   "onay",
   "bewaard",
   "verwijder",
   "toestemming",
   "privacidade",
   "salva",
   "consentimento",
   "privacidad",
   "guardan",
   "consentimiento",
   "salvat",
   "consenso",
   "prywatnoś",
   "zdjęci",
   "zapisyw",
   "zgod"
  ],
  [
   "누가",
   "만들",
   "회사",
   "팀",
   "연락처",
   "문의",
   "UNEXPOSED",
   "펜타콘",
   "who made",
   "company",
   "team",
   "contact",
   "pentacorp",
   "кто",
   "компан",
   "команд",
   "谁",
   "公司",
   "团队",
   "誰",
   "会社",
   "チーム",
   "entreprise",
   "équipe",
   "firma",
   "شركة",
   "فريق",
   "công ty",
   "टोली",
   "कंपनी",
   "टीम",
   "บริษัท",
   "ทีม",
   "شرکت",
   "تیم",
   "företag",
   "কোম্পানি",
   "টিম",
   "perusahaan",
   "şirket",
   "ekip",
   "bedrijf",
   "empresa",
   "equipe",
   "equipo",
   "azienda",
   "zespół"
  ]
 ]
};

  // 추천 질문 4개가 가리키는 답변 번호 (0:스캔, 2:요금제, 1:로그인, 7:개인정보)
  const SUGGESTION_TARGETS = [0, 2, 1, 7];

  function getLang(){
    let code = 'ko';
    try { code = localStorage.getItem('unexposed-lang') || 'ko'; } catch(e){}
    return DATA.ui[code] ? code : 'ko';
  }
  function ui(){ return DATA.ui[getLang()]; }

  const closeBtn = document.getElementById('support-close-btn');
  const panel = document.getElementById('support-panel');
  const overlay = document.getElementById('support-overlay-bg');
  const messages = document.getElementById('support-messages');
  const suggestionsBox = document.getElementById('support-suggestions');
  const input = document.getElementById('support-input');
  const sendBtn = document.getElementById('support-send-btn');
  const headerTitle = panel.querySelector('.support-header h4');
  const headerSub = panel.querySelector('.support-header p');

  let renderedLang = null;

  function applyStaticTexts(){
    const t = ui();
    if(headerTitle) headerTitle.textContent = t.title;
    if(headerSub) headerSub.textContent = t.sub;
    input.placeholder = t.ph;
    sendBtn.textContent = t.send;
    closeBtn.setAttribute('aria-label', t.close);
  }

  function addMessage(text, from){
    const div = document.createElement('div');
    div.className = `support-msg ${from}`;
    div.setAttribute('dir', 'auto');
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderSuggestions(){
    suggestionsBox.innerHTML = '';
    ui().sug.forEach((text, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'support-suggestion-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => handleUserMessage(text, SUGGESTION_TARGETS[i]));
      suggestionsBox.appendChild(chip);
    });
  }

  function findAnswerIndex(message){
    const lower = message.toLowerCase();
    let best = -1;
    let bestScore = 0;
    DATA.kw.forEach((keywords, idx) => {
      const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0);
      if(score > bestScore){
        bestScore = score;
        best = idx;
      }
    });
    return best;
  }

  function handleUserMessage(text, forcedIndex){
    const trimmed = text.trim();
    if(!trimmed) return;
    addMessage(trimmed, 'user');
    input.value = '';
    setTimeout(() => {
      const t = ui();
      const idx = (typeof forcedIndex === 'number') ? forcedIndex : findAnswerIndex(trimmed);
      addMessage(idx >= 0 ? t.a[idx] : t.fallback, 'bot');
    }, 300);
  }

  function resetConversation(){
    messages.innerHTML = '';
    addMessage(ui().hello, 'bot');
    renderSuggestions();
    renderedLang = getLang();
  }

  function openPanel(){
    applyStaticTexts();
    // 처음 열었거나, 닫혀 있는 동안 언어를 바꿨으면 새 언어로 대화를 다시 시작해요
    if(messages.children.length === 0 || renderedLang !== getLang()){
      resetConversation();
    }
    panel.classList.add('open');
    overlay.hidden = false;
    input.focus();
  }
  function closePanel(){
    panel.classList.remove('open');
    overlay.hidden = true;
  }

  applyStaticTexts();

  closeBtn.addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);
  sendBtn.addEventListener('click', () => handleUserMessage(input.value));
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter') handleUserMessage(input.value);
  });

  window.openSupportPanel = openPanel;
})();

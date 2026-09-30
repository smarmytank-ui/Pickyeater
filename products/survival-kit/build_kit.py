from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "FoodMyWay-Picky-Eater-Survival-Kit.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#17352e")
GREEN = colors.HexColor("#27765f")
MINT = colors.HexColor("#eef7f2")
CREAM = colors.HexColor("#fff8ed")
MUTED = colors.HexColor("#5f746d")
LINE = colors.HexColor("#dce8e3")
YELLOW = colors.HexColor("#f6b544")

base = getSampleStyleSheet()
styles = {
    "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=34, leading=36, textColor=INK, spaceAfter=16),
    "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=25, leading=28, textColor=INK, spaceAfter=12),
    "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=GREEN, spaceBefore=9, spaceAfter=6),
    "body": ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica", fontSize=10.2, leading=14.2, textColor=INK, spaceAfter=7),
    "small": ParagraphStyle("small", parent=base["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=MUTED, spaceAfter=5),
    "eyebrow": ParagraphStyle("eyebrow", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.2, leading=10, textColor=GREEN, uppercase=True, spaceAfter=7),
    "center": ParagraphStyle("center", parent=base["BodyText"], fontName="Helvetica", fontSize=11, leading=15, alignment=TA_CENTER, textColor=MUTED),
    "quote": ParagraphStyle("quote", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=INK, leftIndent=13, borderColor=YELLOW, borderWidth=0, borderLeft=4, borderPadding=10, spaceBefore=8, spaceAfter=10),
}


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(0.7 * inch, 0.58 * inch, 7.8 * inch, 0.58 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.7 * inch, 0.38 * inch, "FOOD MY WAY  |  Start with what they'll eat.")
    canvas.drawRightString(7.8 * inch, 0.38 * inch, str(doc.page))
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=letter, rightMargin=.7*inch, leftMargin=.7*inch, topMargin=.65*inch, bottomMargin=.72*inch,
                      title="Food My Way: The Picky Eater Survival Kit", author="Food My Way / TP Biz Ops LLC")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates(PageTemplate(id="kit", frames=frame, onPage=footer))
story = []


def p(text, style="body"):
    story.append(Paragraph(text, styles[style]))


def page(label, title, intro=None):
    p(label.upper(), "eyebrow")
    p(title, "h1")
    if intro: p(intro)


def bullets(items):
    for item in items:
        p(f"<b>•</b> {item}")


def box(title, body, color=MINT):
    table = Table([[Paragraph(f"<b>{title}</b><br/>{body}", styles["body"])]], colWidths=[doc.width])
    table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), color), ("BOX", (0,0), (-1,-1), .8, LINE),
                               ("LEFTPADDING", (0,0), (-1,-1), 13), ("RIGHTPADDING", (0,0), (-1,-1), 13),
                               ("TOPPADDING", (0,0), (-1,-1), 11), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
    story.extend([table, Spacer(1, 9)])


def checklist(rows, widths=(3.1*inch, 3.9*inch)):
    data = [[Paragraph(f"□ {a}", styles["body"]), Paragraph(b, styles["small"])] for a,b in rows]
    table = Table(data, colWidths=widths, repeatRows=0)
    table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("GRID", (0,0), (-1,-1), .5, LINE),
                               ("BACKGROUND", (0,0), (0,-1), MINT), ("LEFTPADDING", (0,0), (-1,-1), 9),
                               ("RIGHTPADDING", (0,0), (-1,-1), 9), ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
    story.append(table)


# 1 Cover
story.append(Spacer(1, .22*inch)); story.append(Image(str(ROOT / "food-my-way-pfp-512.png"), width=1.05*inch, height=1.05*inch)); story.append(Spacer(1, .14*inch)); p("FOOD MY WAY", "eyebrow"); p("The Picky Eater<br/>Survival Kit", "title")
p("14 Days of Easy Meals, Simple Swaps &amp; Less Mealtime Stress", "quote")
story.append(Spacer(1, .4*inch)); box("Start with what they'll eat.", "A practical plan built around familiar foods, flexible components, and permission to change what does not work.", CREAM)
p("Stop guessing what to make. Start with foods they already eat.", "center")
story.append(Spacer(1, 1.25*inch)); p("FoodMyWay.app", "center"); p("© 2026 TP Biz Ops LLC. Personal household use only.", "small"); story.append(PageBreak())

# 2 Important note
page("Before you begin", "A practical tool, not a treatment plan")
p("This kit is designed to reduce meal-planning friction. It cannot guarantee that a child or adult will eat a particular food, and it is not medical, nutrition, occupational-therapy, or feeding-therapy advice.")
box("Get qualified support when needed", "Talk with a pediatrician, registered dietitian, feeding therapist, or other qualified professional about significant restriction, growth concerns, pain, choking, swallowing difficulty, dehydration, suspected allergy, nutritional deficiency, or distress around eating.", CREAM)
p("Allergy reminder", "h2"); p("No substitution is universally allergy-safe. Ingredients and manufacturing practices change. Read current labels every time and evaluate cross-contact based on your household's needs. Restaurant guidance in this kit does not confirm ingredient or cross-contact safety.")
p("Food safety", "h2"); p("Use a food thermometer for raw animal proteins. Cook poultry to 165°F (74°C), ground meats to 160°F (71°C), and whole cuts of beef or pork to 145°F (63°C) followed by a 3-minute rest. Refrigerate perishable leftovers promptly.")
p("Low pressure", "h2"); p("Offering a new option is optional. Keep a familiar component available when practical, allow foods to remain separate, and treat “not today” as useful information rather than failure."); story.append(PageBreak())

# 3 start
page("Start here", "Your five-minute setup", "The fastest way to use this kit is to choose one familiar food, one realistic meal format, and one backup.")
checklist([("Circle three accepted proteins", "Examples: nuggets, eggs, deli turkey, beans."),("Circle three accepted starches", "Examples: noodles, bread, rice, potatoes."),("Choose two easy formats", "Examples: snack plate, quesadilla, pasta, breakfast-for-dinner."),("Name one texture to preserve", "Examples: crispy, smooth, plain, foods not touching."),("Choose an emergency meal", "Keep the ingredients available for a tired night."),("Pick only the next three days", "You do not need to commit to all 14 days today.")])
story.append(Spacer(1, 12)); box("The rule", "If a meal is rejected, replace it with a familiar backup and record what was different. The plan serves the household; the household does not serve the plan."); story.append(PageBreak())

# 4 worksheet
page("Know your eater", "Preference snapshot")
checklist([("Foods that usually work", "____________________________________________"),("Preferred textures", "crispy / crunchy / smooth / soft / chewy / other: ______"),("Preferred temperature", "cold / cool / room temperature / warm / hot"),("Mixed foods", "okay / sometimes / prefer separate components"),("Reliable brands or shapes", "____________________________________________"),("Hard no ingredients", "____________________________________________"),("Known allergies / medical limits", "____________________________________________"),("Time available on weekdays", "10 / 20 / 30+ minutes"),("Cooking equipment", "oven / air fryer / microwave / stovetop / other"),("Household budget notes", "____________________________________________")])
story.append(PageBreak())

# 5 familiar foods
page("Build your base", "The familiar food list", "Write what actually works now. There is no score for variety.")
checklist([("Proteins", "____________________________________________"),("Starches and breads", "____________________________________________"),("Dairy or alternatives", "____________________________________________"),("Fruits", "____________________________________________"),("Vegetables", "____________________________________________"),("Sauces and dips", "____________________________________________"),("Snacks", "____________________________________________"),("Breakfast foods", "____________________________________________"),("Freezer backups", "____________________________________________"),("Restaurant orders", "____________________________________________")])
story.append(PageBreak())

# 6 swaps
page("The swap system", "Change the smallest useful thing")
checklist([("Taste", "Keep the base; serve seasoning or sauce on the side."),("Texture", "Bake instead of simmering; toast instead of leaving soft; blend a sauce smooth."),("Mixed foods", "Serve components in separate piles or small bowls."),("Temperature", "Let a portion cool before serving; keep cold items away from hot ones."),("Brand or shape", "Preserve the familiar shape while changing only one other feature."),("Time", "Use frozen or pre-cooked components and assemble rather than cook from scratch."),("Allergen", "Use a household-approved substitute and verify its current label and cross-contact information."),("Rejected meal", "Return to an accepted backup. Note “not today,” not “failed.”")])
story.append(PageBreak())

# 7 bridges
page("Food bridges", "Nearby choices, not a forced ladder")
p("A food bridge keeps one or more familiar features while changing something small. These examples change multiple sensory features at times; choose only a step that fits the person's actual preferences.")
box("Crispy chicken", "Chicken nuggets → a similar crispy strip → a different breaded chicken shape → chicken beside separate taco components")
box("Plain noodles", "Plain noodles → butter offered separately → parmesan offered separately → mild sauce on the side → chicken offered alongside")
box("Toast", "Familiar toast → same bread cut differently → cheese beside toast → open-faced cheese toast → simple grilled cheese")
box("Potatoes", "Familiar fries → potato wedges → roasted cubes → baked potato with toppings kept separate")
p("Permission language", "h2"); p("“You can leave it on the plate.” “The sauce can stay in the cup.” “Would you like the usual shape or this shape?” “We can go back to the familiar version next time.”"); story.append(PageBreak())

week1 = [["Day","Breakfast","Lunch","Dinner","Snack"],["1","Toast + fruit","Turkey roll-up plate","Cheesy chicken quesadillas","Crackers + cheese"],["2","Yogurt + cereal","Quesadilla leftovers","Pizza bagels","Fruit + pretzels"],["3","Waffles","Snack plate","Crispy chicken bites + potatoes","Yogurt"],["4","Egg + toast","Chicken bites leftovers","Cheesy taco rice, separated","Popcorn*"],["5","Cereal + milk","Plain pasta cup","Butter-parmesan chicken pasta","Fruit"],["6","Breakfast quesadilla","Leftover pasta","Mini cheeseburger sliders","Crackers"],["7","Toast + yogurt","Slider snack plate","Build-your-own baked potatoes","Favorite snack"]]
week2 = [["Day","Breakfast","Lunch","Dinner","Snack"],["8","Cereal + fruit","Baked potato leftovers","Chicken Alfredo roll-ups","Pretzels + dip"],["9","Mini pancakes","Roll-up leftovers","Homemade chicken nugget bowls","Fruit"],["10","Egg + toast","Snack plate","Breakfast quesadillas","Yogurt"],["11","Waffles","Plain noodles","Build-your-own pasta night","Cheese + crackers"],["12","Yogurt + cereal","Pasta leftovers","Separate-component taco night","Fruit"],["13","Toast + fruit","Quesadilla triangles","Pizza toast bar","Pretzels"],["14","Favorite breakfast","Leftover choice","Emergency meal + favorite side","Favorite snack"]]

def meal_table(data):
    table=Table([[Paragraph(str(x),styles["small"]) for x in row] for row in data],colWidths=[.42*inch,1.15*inch,1.25*inch,2.25*inch,1.25*inch],repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.5,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,MINT]),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])); story.append(table)

page("The 14-day plan", "How the two weeks fit together")
p("The dinner recipes on the next pages reuse chicken, tortillas, cheese, potatoes, pasta, bread, rice, and a small set of optional toppings. Breakfasts, lunches, and snacks are templates: substitute from your familiar food list.")
bullets(["Choose a familiar component before adding an optional variation.","Pack leftovers only when their texture still works for the eater.","Keep sauces and toppings separate when that preserves predictability.","Replace any meal with an emergency option without trying to “make up” for it later."])
box("*Age and safety note", "Popcorn and other hard or round foods can be choking hazards for young children. Choose developmentally appropriate textures and preparation.", CREAM); story.append(PageBreak())
page("Week 1", "Seven days of adaptable meals"); meal_table(week1); story.append(Spacer(1,8)); p("Use blank spaces on the grocery page to record the exact brands, shapes, or substitutions your household needs.","small"); story.append(PageBreak())

groceries1=[("Protein","2 lb chicken breast or tenders; 1 lb ground beef or turkey; 8 eggs; deli turkey"),("Dairy / alternatives","3 cups shredded cheese; parmesan; yogurt; milk or household alternative"),("Bread / grains","10 tortillas; 6 bagels; pasta; rice; slider buns; cereal; waffles; crackers"),("Produce","4 baking potatoes; 1 lb small potatoes; 2 fruits; optional lettuce or mild vegetables"),("Pantry / freezer","Pizza sauce; taco seasoning; breadcrumbs; butter or alternative; preferred dips"),("Household substitutions","____________________________________________"),("Reliable backups","____________________________________________")]
page("Week 1", "Grocery list"); checklist(groceries1); box("Before shopping", "Cross off anything already in the pantry. Replace ingredients with exact familiar brands or shapes when that difference matters."); story.append(PageBreak())
page("Week 2", "Seven days of adaptable meals"); meal_table(week2); story.append(PageBreak())
groceries2=[("Protein","2 lb chicken breast or tenders; 1 lb ground beef, turkey, beans, or household taco filling; 10 eggs"),("Dairy / alternatives","3 cups shredded cheese; parmesan; Alfredo sauce or ingredients; yogurt; milk or alternative"),("Bread / grains","Tortillas; pasta; rice; sandwich bread; breadcrumbs; cereal; pancakes or waffles; crackers"),("Produce","2 fruits; optional taco vegetables; preferred pizza toppings; familiar sides"),("Pantry / freezer","Pizza sauce; preferred pasta sauce; taco seasoning; butter or alternative; dips"),("Household substitutions","____________________________________________"),("Reliable backups","____________________________________________")]
page("Week 2", "Grocery list"); checklist(groceries2); box("Keep one emergency meal untouched", "A backup is useful only if its ingredients are still available on the night you need it."); story.append(PageBreak())

recipes = [
 ("Cheesy Chicken Quesadillas",4,"20 minutes",["8 small tortillas","2 cups cooked chicken, chopped","2 cups shredded cheese","Optional mild salsa or dip on the side"],["Warm a skillet over medium heat.","Place cheese and chicken on half of each tortilla; keep one plain if needed.","Fold and cook 2-3 minutes per side until crisp and the filling is hot."],"Serve chicken, cheese, and tortilla separately; or make a cheese-only version.","Use a household-approved gluten-free tortilla or dairy-free cheese; verify labels and cross-contact.","Microwave a cheese tortilla, then add warmed pre-cooked chicken beside it."),
 ("Pizza Bagels",4,"18 minutes",["4 bagels, split","3/4 cup pizza sauce","2 cups shredded mozzarella","Optional preferred toppings"],["Heat oven to 400°F.","Place bagels cut-side up. Leave sauce off selected halves if preferred.","Add cheese and toppings; bake 8-10 minutes until hot."],"Serve a toasted bagel with sauce and cheese in separate cups.","Use an approved bread or cheese alternative and recheck sauce labels.","Toast the bagel and serve with cheese slices and warmed sauce for dipping."),
 ("Crispy Chicken Parmesan Bites",4,"30 minutes",["1 1/2 lb chicken breast, 1-inch pieces","1 cup breadcrumbs","1/3 cup parmesan","1 egg, beaten","1/2 cup mild tomato sauce on the side"],["Heat oven to 425°F and line a sheet pan.","Dip chicken in egg, then coat with breadcrumbs and parmesan.","Bake 16-20 minutes, turning once, until chicken reaches 165°F."],"Reserve un-sauced bites and keep parmesan separate.","Use approved crumbs, egg replacer, or dairy-free topping; verify labels.","Bake familiar frozen chicken according to its label and offer sauce separately."),
 ("Cheesy Taco Rice",4,"25 minutes",["1 lb ground beef, turkey, or beans","2 cups cooked rice","1 cup shredded cheese","1 tbsp mild taco seasoning","Optional toppings in separate bowls"],["Cook meat to 160°F, or warm beans; drain if needed.","Stir seasoning into the protein with 1/4 cup water and simmer 3 minutes.","Serve rice, protein, cheese, and toppings in separate sections or combine as preferred."],"Offer plain rice, plain protein, and cheese without mixing.","Choose approved seasoning and cheese alternatives; verify labels.","Use microwave rice and pre-cooked protein or drained beans."),
 ("Butter-Parmesan Chicken Pasta",4,"25 minutes",["12 oz pasta","2 cups cooked chicken","3 tbsp butter or alternative","1/2 cup parmesan","Pasta water as needed"],["Cook pasta according to the package and reserve 1/2 cup cooking water.","Toss pasta with butter; add water a spoonful at a time if dry.","Warm chicken separately. Offer parmesan on the side or toss in."],"Keep noodles plain and place chicken, butter, and cheese beside them.","Use approved pasta and dairy alternatives; verify chicken seasoning labels.","Use microwave pasta or leftover noodles with pre-cooked chicken."),
 ("Mini Cheeseburger Sliders",4,"25 minutes",["1 lb ground beef or turkey","8 slider buns","8 small cheese slices","Preferred condiments on the side"],["Shape 8 thin patties.","Cook in a skillet until ground meat reaches 160°F.","Add cheese if wanted and serve on buns with toppings separate."],"Serve patty, bun, and cheese as separate components.","Use approved buns and cheese alternatives; check condiment labels.","Use fully cooked frozen patties prepared according to the label."),
 ("Breakfast Quesadillas",4,"20 minutes",["8 eggs","4 large tortillas","1 cup shredded cheese","Optional cooked breakfast meat"],["Scramble eggs in a skillet until set.","Place eggs and cheese on half of each tortilla and fold.","Cook 2-3 minutes per side until crisp and hot."],"Serve scrambled egg, tortilla wedges, and cheese separately.","Use approved tortilla and cheese alternatives; omit egg only if replaced with a familiar filling.","Make a cheese-only tortilla and serve a familiar breakfast protein beside it."),
 ("Chicken Alfredo Roll-Ups",4,"35 minutes",["8 cooked lasagna noodles","2 cups cooked chicken","1 1/2 cups Alfredo sauce","1 cup shredded mozzarella"],["Heat oven to 375°F.","Spread a thin layer of sauce on noodles; add chicken and roll.","Place in a baking dish, top as preferred, and bake 18-20 minutes until hot."],"Keep one noodle plain and serve chicken and sauce separately.","Use approved pasta, sauce, and cheese alternatives; verify labels.","Serve warmed pasta, pre-cooked chicken, and jarred sauce in separate bowls."),
 ("Build-Your-Own Baked Potatoes",4,"55 minutes",["4 medium baking potatoes","1 cup shredded cheese","1 cup cooked chicken or beans","Butter or alternative","Preferred toppings"],["Heat oven to 425°F. Pierce potatoes and bake 45-55 minutes until tender.","Warm protein and arrange every topping separately.","Split potatoes and let each person build or leave plain."],"Offer the familiar filling separately or use crispy potato wedges instead.","Verify toppings and cross-contact; use approved dairy alternatives.","Microwave potatoes according to appliance guidance and use pre-cooked toppings."),
 ("Homemade Chicken Nugget Bowls",4,"30 minutes",["1 1/2 lb chicken breast, bite-size pieces","1 cup breadcrumbs","1 egg, beaten","2 cups cooked rice or potatoes","2 cups familiar produce or fruit"],["Heat oven to 425°F.","Coat chicken with egg and crumbs; arrange on a lined pan.","Bake 16-20 minutes to 165°F. Serve each component separately."],"Use a familiar frozen nugget and keep every bowl component separate.","Use approved crumbs and egg substitute; verify frozen-product labels.","Prepare frozen nuggets and microwave rice; add a familiar side."),
 ("Separate-Component Taco Night",4,"25 minutes",["1 lb ground meat or beans","8 tortillas","1 cup cheese","Mild seasoning","Preferred toppings"],["Cook ground meat to 160°F or warm beans.","Season only the portion that wants seasoning.","Place tortillas, filling, cheese, and toppings in separate bowls."],"Offer a plain tortilla, plain protein, and cheese without assembly.","Use approved tortillas, seasoning, and cheese alternatives.","Use pre-cooked protein or beans and microwave tortillas."),
 ("Build-Your-Own Pasta Night",4,"25 minutes",["12 oz pasta","2 cups cooked chicken or beans","1 1/2 cups preferred sauce","1/2 cup parmesan","Optional familiar vegetables"],["Cook pasta according to the package.","Warm protein and sauce in separate pans or microwave-safe bowls.","Place noodles, sauce, protein, cheese, and vegetables separately."],"Keep a serving of plain noodles and familiar protein untouched.","Use approved pasta, sauce, and cheese alternatives; verify labels.","Use microwave pasta, jarred sauce, and pre-cooked protein."),
 ("Pizza Toast Bar",4,"18 minutes",["8 bread slices","3/4 cup pizza sauce","2 cups shredded cheese","Preferred toppings"],["Heat oven to 400°F.","Toast bread lightly, then let each person choose sauce, cheese, or plain.","Bake 6-8 minutes until cheese melts and toast stays crisp."],"Serve plain toast with sauce and cheese in cups.","Use approved bread and cheese alternatives; verify sauce labels.","Toast bread and serve cheese slices with warmed sauce."),
 ("Loaded Snack Plates",4,"10 minutes",["A familiar cracker or bread","A familiar protein","Cheese or approved alternative","One fruit or vegetable","A preferred dip, optional"],["Choose 3-5 accepted components.","Place foods in separate sections with small portions.","Add one optional item only if that feels low pressure."],"Use only familiar items; the plate does not require a new food.","Check every packaged item and shared dip for allergens and cross-contact.","Open packages, wash produce as needed, and assemble."),
 ("Crispy Potato Chicken Tray",4,"40 minutes",["1 1/2 lb chicken tenders","1 lb potato wedges","2 tbsp oil","Salt or preferred seasoning","Familiar side"],["Heat oven to 425°F.","Toss potatoes with half the oil and bake 15 minutes.","Add chicken brushed with remaining oil; bake 18-22 minutes until chicken reaches 165°F."],"Keep seasoning off selected pieces and prevent foods from touching.","Use clean utensils and approved seasonings; evaluate shared-pan cross-contact.","Use frozen wedges and familiar pre-cooked chicken prepared to labels."),
 ("Emergency Grilled Cheese Plate",4,"15 minutes",["8 bread slices","8 cheese slices or shredded equivalent","2 tbsp butter or alternative","Fruit, crackers, or preferred side"],["Warm a skillet over medium-low heat.","Assemble sandwiches and lightly butter the outside.","Cook 3-4 minutes per side until golden and hot; serve with a familiar side."],"Serve toast and cheese separately instead of assembling.","Use approved bread, cheese, and spread alternatives; verify labels.","Toast bread and serve with cheese slices without grilling."),
]

for idx,(name,servings,time,ingredients,steps,plain,allergy,easy) in enumerate(recipes,1):
    page(f"Recipe {idx} of {len(recipes)}", name, f"Serves {servings}  |  About {time}")
    left=[Paragraph("<b>Ingredients</b>",styles["h2"])]+[Paragraph(f"• {x}",styles["body"]) for x in ingredients]
    right=[Paragraph("<b>Steps</b>",styles["h2"])]+[Paragraph(f"{n}. {x}",styles["body"]) for n,x in enumerate(steps,1)]
    t=Table([[left,right]],colWidths=[3.05*inch,3.95*inch]); t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("BACKGROUND",(0,0),(0,0),MINT),("BACKGROUND",(1,0),(1,0),colors.white),("BOX",(0,0),(-1,-1),.6,LINE),("INNERGRID",(0,0),(-1,-1),.6,LINE),("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),("TOPPADDING",(0,0),(-1,-1),9),("BOTTOMPADDING",(0,0),(-1,-1),8)])); story.append(t); story.append(Spacer(1,8))
    box("Plain or separated option", plain)
    box("Relevant allergen reminder", allergy, CREAM)
    box("Low-energy option", easy)
    story.append(PageBreak())

page("Eating away from home", "Restaurant and takeout guide")
checklist([("Burger restaurant", "Plain patty, bun, cheese, fries, or fruit kept separate."),("Pizza restaurant", "Familiar crust and cheese; request toppings or sauce changes only when useful."),("Mexican restaurant", "Tortilla, protein, rice, beans, cheese, and toppings served separately."),("Italian restaurant", "Plain noodles with butter, cheese, or sauce in a side cup."),("Breakfast restaurant", "Eggs, toast, pancakes, potatoes, and fruit as separate components."),("Chicken restaurant", "Familiar breaded shape, plain side, and dip in a closed cup."),("Before ordering", "Check current allergen information directly with the restaurant when needed."),("Backup", "Pack an accepted shelf-stable option when appropriate.")]); story.append(PageBreak())

page("Tired-night backups", "10 emergency meals")
bullets(["Familiar frozen nuggets + microwave rice + fruit","Cheese quesadilla + familiar dip","Toast + egg + fruit","Plain noodles + butter or parmesan on the side","Crackers + cheese + deli turkey snack plate","Microwave baked potato + toppings separate","Frozen waffles + yogurt","Grilled cheese or toast-and-cheese plate","Rice + warmed beans or pre-cooked protein, separate","A reliable restaurant or takeout order"])
box("Make it work", "Keep two freezer options, two pantry options, and one known takeout order available. Using the backup is part of the plan, not a failure."); story.append(PageBreak())

page("Optional exploration", "Try something new without making dinner a test")
bullets(["Begin with an accepted food or meal format.","Change one feature when possible: shape, brand, seasoning, temperature, or presentation.","Use a tiny optional portion and keep the familiar food available.","Let the person smell, touch, lick, taste, eat, or decline without scoring the response.","Record the preparation details; “carrot” is less useful than “cold thin carrot stick.”","Stop when stress rises. Go back to the familiar version next time."])
p("A useful question", "h2"); p("Instead of “Did you like it?” try: “Was it too crunchy, too soft, too mixed, too strong, or something else?” The answer can guide the next choice."); story.append(PageBreak())

page("Food tracker", "Notice patterns, not performance")
data=[["Food / meal","Preparation details","Liked it","Might try again","Not today"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"],["","","□","□","□"]]
t=Table([[Paragraph(x,styles["small"]) for x in row] for row in data],colWidths=[1.45*inch,2.7*inch,.8*inch,1.2*inch,.8*inch]); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.6,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,MINT]),("TOPPADDING",(0,0),(-1,-1),10),("BOTTOMPADDING",(0,0),(-1,-1),10)])); story.append(t); story.append(PageBreak())

page("Make your own week", "Reusable seven-day planner")
data=[["Day","Breakfast","Lunch","Dinner","Snack / backup"]]+[[str(i),"","","",""] for i in range(1,8)]
t=Table([[Paragraph(x,styles["small"]) for x in row] for row in data],colWidths=[.42*inch,1.25*inch,1.25*inch,2.3*inch,1.55*inch]); t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.6,LINE),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,MINT]),("TOPPADDING",(0,0),(-1,-1),14),("BOTTOMPADDING",(0,0),(-1,-1),14)])); story.append(t); story.append(Spacer(1,12)); p("Foods or leftovers to use first: _________________________________________________"); p("One emergency meal to protect: __________________________________________________"); story.append(PageBreak())

page("Your next step", "Build the next menu with Food My Way")
p("The kit gives you a reliable starting point. Food My Way helps you keep adapting: start with familiar ingredients, generate a flexible recipe, swap what will not work, save successful meals, and build a weekly plan and grocery list.")
box("Open the app", '<link href="https://foodmyway.app/" color="#1c5948"><u>FoodMyWay.app</u></link>')
box("Try this first", "Enter four foods your household already accepts. Generate one dinner, then change only the ingredient or texture that does not fit.", CREAM)
p("Keep expectations honest", "h2"); p("Food My Way provides planning ideas, not guaranteed acceptance, individualized medical advice, or verified allergen safety. Use your judgment and qualified support when needed.")
story.append(Spacer(1,1.2*inch)); p("Start with what they'll eat.<br/>We help you figure out what comes next.","quote"); p("Questions? support@foodmyway.app", "center")

doc.build(story)
print(OUT)

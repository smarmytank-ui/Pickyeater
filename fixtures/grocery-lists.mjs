const item=(name,quantity=1,unit='count')=>({name,quantity,unit,displayText:`${quantity} ${unit} ${name}`});

export const representativeGroceryLists=[
  {name:'plain chicken dinner',items:[item('chicken breast',1,'lb'),item('potatoes',4),item('broccoli',2,'cups'),item('cheddar cheese',1,'cups')]},
  {name:'taco night',items:[item('ground beef',1,'lb'),item('flour tortillas',8),item('shredded cheese',2,'cups'),item('mild salsa',1,'jar')]},
  {name:'buttered pasta',items:[item('spaghetti',12,'oz'),item('butter',4,'tbsp'),item('parmesan cheese',1,'cups')]},
  {name:'breakfast basics',items:[item('eggs',6,'eggs'),item('white bread',1,'package'),item('butter',8,'tbsp'),item('strawberries',1,'lb')]},
  {name:'grilled cheese and soup',items:[item('sandwich bread',1,'package'),item('cheddar cheese slices',8,'slices'),item('tomato soup',2,'cans')]},
  {name:'chicken nuggets and fries',items:[item('frozen chicken nuggets',1,'package'),item('frozen french fries',1,'package'),item('ketchup',1,'count')]},
  {name:'rice bowl',items:[item('white rice',2,'cups'),item('chicken thighs',1,'lb'),item('soy sauce',3,'tbsp'),item('carrots',1,'bunch')]},
  {name:'baked potato bar',items:[item('russet potatoes',6),item('sour cream',1,'pint'),item('shredded cheddar',2,'cups'),item('green onions',1,'bunch')]},
  {name:'simple pizza',items:[item('pizza dough',1,'package'),item('pizza sauce',1,'can'),item('mozzarella',12,'oz'),item('pepperoni',6,'oz')]},
  {name:'mac and peas',items:[item('elbow macaroni',12,'oz'),item('cheddar cheese',8,'oz'),item('whole milk',2,'cups'),item('frozen peas',1,'cups')]},
  {name:'quesadillas',items:[item('flour tortillas',8),item('monterey jack cheese',12,'oz'),item('canned black beans',2,'cans')]},
  {name:'turkey sandwiches',items:[item('sandwich bread',1,'package'),item('sliced turkey',1,'lb'),item('provolone slices',8,'slices'),item('mayonnaise',1)]},
  {name:'pancake breakfast',items:[item('pancake mix',1,'package'),item('eggs',2,'eggs'),item('milk',500,'ml'),item('maple syrup',1)]},
  {name:'yogurt parfaits',items:[item('vanilla yogurt',1,'quart'),item('granola',12,'oz'),item('blueberries',1,'pint'),item('bananas',4)]},
  {name:'meatballs and noodles',items:[item('frozen meatballs',1,'package'),item('egg noodles',12,'oz'),item('butter',4,'tbsp'),item('parmesan',4,'oz')]},
  {name:'mild chili',items:[item('ground turkey',1,'lb'),item('kidney beans',2,'cans'),item('tomato sauce',2,'cans'),item('mild chili powder',2,'tsp')]},
  {name:'fish sticks plate',items:[item('frozen fish sticks',1,'package'),item('frozen corn',2,'cups'),item('potatoes',2,'lb')]},
  {name:'rotisserie chicken wraps',items:[item('rotisserie chicken',1),item('flour tortillas',8),item('shredded lettuce',1,'package'),item('ranch dressing',1)]},
  {name:'peanut butter toast',items:[item('sandwich bread',1,'package'),item('peanut butter',1),item('bananas',6),item('milk',1,'gallon')]},
  {name:'bean and cheese burritos',items:[item('refried beans',2,'cans'),item('flour tortillas',10),item('shredded cheddar',12,'oz'),item('white rice',2,'cups')]},
  {name:'metric chicken pasta',items:[item('chicken breast',1,'kg'),item('penne pasta',500,'grams'),item('cream',250,'ml'),item('parmesan',100,'grams')]},
  {name:'simple stir fry',items:[item('chicken breast',1,'lb'),item('white rice',2,'cups'),item('frozen stir fry vegetables',1,'package'),item('teriyaki sauce',6,'tbsp')]},
  {name:'burger night',items:[item('ground beef',2,'lb'),item('hamburger buns',8),item('american cheese slices',8,'slices'),item('lettuce',1,'head')]},
  {name:'snack plate',items:[item('cheddar crackers',1,'package'),item('string cheese',8),item('seedless grapes',2,'lb'),item('baby carrots',1,'package')]},
  {name:'sensory-safe white foods',items:[item('plain bagels',1,'package'),item('cream cheese',8,'oz'),item('white rice',2,'lb'),item('vanilla yogurt',1,'quart')]}
];

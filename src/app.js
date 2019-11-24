import Unit from './models/Unit';
import Hero from './models/Hero';

const christian = new Hero('Christian', 0, 0, 20, 'offense', {
    archery: 0,
    offense: 3
});

const kyrre = new Hero('Kyrre', 0, 0, 20, 'armorer', {
    archery: 3,
    offense: 0,
    armorer: 3
});

const pikeman = new Unit('Pikeman', 1, 4, 5, 1, 3);
const tenPikeman = new Unit('Pikeman', 10, 4, 5, 1, 3);
const blessedPikeman = new Unit('Pikeman', 1, 4, 5, 1, 3, false, { bless: true, shield: true });

const peasant = new Unit('Peasant', 1, 1, 5, 1, 1);

blessedPikeman.attackUnit(christian, kyrre, peasant);

blessedPikeman.attackUnit(kyrre, christian, peasant);

tenPikeman.attackUnit(christian, kyrre, peasant);

tenPikeman.attackUnit(kyrre, christian, peasant, true);
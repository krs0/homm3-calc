import tippy from 'tippy.js';

import Hero from '../models/Hero';
import HeroView from './hero';
import ResultsView from './results';

import unitService from '../services/unitService';
import spellService from '../services/spellService';
import damageService from '../services/damageService';
import analyticsService from '../services/analyticsService';

export default class DamageCalculator {
	init(containerEl) {
		this.attackerUnit = unitService.getUnit('INFERNAL_TROGLODYTE', 'SOD');
		this.attackerHero = new Hero('Christian', 0, 0, 1, 'elves', {
			offense: 0,
			archery: 0,
			earth_magic: 0,
		});

		this.defenderHero = new Hero('Ciele', 0, 0, 1, 'air_shield', {
			armorer: 0,
		});

		this.defenderUnit = unitService.getUnit('IMP', 'SOD');

		this.attackerHeroView = new HeroView({
			hero: this.attackerHero,
			skills: [
				'Earth_Magic',
				'Water_Magic',
				'Air_Magic',
				'Fire_Magic',
				'Offense',
				'Archery',
			],
			containerElId: 'attacker-hero',
			title: 'Attacking hero',
			position: 'attacker',
			onStatUpdate: this.updateHeroStat.bind(this, 'attacker'),
			onSkillSelect: this.selectSkill.bind(this, 'attacker'),
			onSpecialtySelect: this.selectSpecialty.bind(this),
		});

		this.defenderHeroView = new HeroView({
			hero: this.defenderHero,
			skills: [
				'Earth_Magic',
				'Water_Magic',
				'Air_Magic',
				'Fire_Magic',
				'Armorer',
			],
			containerElId: 'defender-hero',
			title: 'Defending hero',
			position: 'defender',
			onStatUpdate: this.updateHeroStat.bind(this, 'defender'),
			onSkillSelect: this.selectSkill.bind(this, 'defender'),
			onSpecialtySelect: this.selectSpecialty.bind(this),
		});

		this.containerEl = document.getElementById(containerEl);

		this.render();
	}

	render() {
		this.containerEl.innerHTML = this.createUnitsHtml();
		this.renderResults();
		this.bindListeners();
	}

	selectUnit(unitInfo, version) {
		const unitMap = {
			attacker: this.attackerUnit,
			defender: this.defenderUnit,
		};

		const unit = unitService.getUnit(unitInfo.slug, version);
		unitMap[unitInfo.position] = unit;

		this.render();
		const analyticsCategory = `${unitInfo.position} unit`;
		analyticsService.logEvent(analyticsCategory, unit.name);
	}

	updateHeroStat(position, stat, value) {
		const activeHero = this.getHeroByPosition(position);
		activeHero[stat] = Number(value);

		this.render();
	}

	/* eslint-disable-next-line consistent-return */
	selectSkill(position, skill, level) {
		const skillSlug = skill.toLowerCase();

		if (
			position === 'defender' &&
			(skill === 'Fire_Magic' || skill === 'Water_Magic')
		) {
			const defenderHero = this.getHeroByPosition('defender');
			const attackerUnit = this.getUnitByPosition('attacker');

			const shouldDisable = defenderHero.skills[skillSlug] === Number(level);
			defenderHero.skills[skillSlug] = shouldDisable ? null : Number(level);

			if (attackerUnit.spells.curse) {
				attackerUnit.spells.curse = shouldDisable
					? 1
					: defenderHero.skills[skillSlug];
			}

			if (attackerUnit.spells.weakness) {
				attackerUnit.spells.weakness = shouldDisable
					? 1
					: defenderHero.skills[skillSlug];
			}

			return this.render();
		}

		const activeHero = this.getHeroByPosition(position);
		const activeUnit = this.getUnitByPosition(position);

		const shouldDisable = activeHero.skills[skillSlug] === Number(level);
		activeHero.skills[skillSlug] = shouldDisable ? null : Number(level);

		const spellsBySchool = {
			water_magic: ['bless', 'weakness', 'prayer'],
			earth_magic: ['shield', 'stone_skin'],
			air_magic: ['airshield', 'precision'],
			fire_magic: ['curse', 'bloodlust', 'slayer', 'frenzy'],
		};

		if (spellsBySchool[skillSlug]) {
			spellsBySchool[skillSlug].forEach((spell) => {
				if (activeUnit.spells[spell]) {
					activeUnit.spells[spell] = shouldDisable
						? 1
						: activeHero.skills[skillSlug];
				}
			});
		}

		if (!shouldDisable) {
			const skillLevelMap = {
				1: 'Basic',
				2: 'Advanced',
				3: 'Expert',
			};

			analyticsService.logEvent(
				'Skill selected',
				`${skillLevelMap[level]} ${skill}`
			);
		}

		this.render();
	}

	selectSpell(position, spell, school) {
		let activeHero = this.getHeroByPosition(position);
		// handle spells that use opposing hero skills
		if (
			position === 'attacker' &&
			(spell === 'curse' || spell === 'weakness')
		) {
			activeHero = this.getHeroByPosition('defender');
		}

		const activeUnit = this.getUnitByPosition(position);

		const isSpellActive = activeUnit.spells[spell];

		if (spell === 'curse') activeUnit.spells.bless = null;
		if (spell === 'bless') activeUnit.spells.curse = null;

		activeUnit.spells[spell] = isSpellActive
			? null
			: activeHero.skills[school] || 1;

		isSpellActive
			? analyticsService.logEvent('Deselect spell', spell)
			: analyticsService.logEvent('Select spell', spell);

		this.render();
	}

	selectSpecialty(position, speciality) {
		const activeHero = this.getHeroByPosition(position);
		activeHero.speciality = speciality;

		analyticsService.logEvent('Select specialty', speciality);
		this.render();
	}

	getHeroByPosition(position) {
		const heroPositionMap = {
			attacker: this.attackerHero,
			defender: this.defenderHero,
		};

		return heroPositionMap[position];
	}

	getUnitByPosition(position) {
		const unitPositionMap = {
			attacker: this.attackerUnit,
			defender: this.defenderUnit,
		};

		return unitPositionMap[position];
	}

	createUnitsHtml() {
		return `
      <div class="row text-center">
        <div class="col-md-6">
          ${this.attackerHeroView.generateHtml()}
          ${this.createUnitHtml('attacker', this.attackerUnit)}
        </div>

        <div class="col-md-6">
          ${this.defenderHeroView.generateHtml()}
          ${this.createUnitHtml('defender', this.defenderUnit)}
        </div>

        <div id="results"></div>
      </div>
    `;
	}

	/* eslint-disable-next-line class-methods-use-this */
	createSpellsHtml(position, unitSpells) {
		const spells = spellService.getSpellsByType(position);

		return Object.keys(spells).reduce((acc, spellKey) => {
			const { image, slug, school, effects } = spells[spellKey];
			const isActive = !!unitSpells[slug];
			const activeClass = isActive ? 'active' : '';
			// const tooltipPrefix = isActive ? 'Turn off' : 'Turn on';

			const spellHtml = `
        <div
          class="spell ${activeClass}"
          data-position="${position}"
					data-spell="${slug}"
					data-school="${school}"
					data-tippy-content="${this.generateSpellTooltip(spells[spellKey])}">
          <img src="./img/${image}"/>
        </div>
      `;

			return acc + spellHtml;
		}, '');
	}

	/* eslint-disable-next-line */
	generateSpellTooltip(spell) {
		const effects = Object.keys(spell.effects)
			.map((key) => {
				return `<b>${key}</b><p>${spell.effects[key]}</p>`;
			})
			.join('');

		return `
			<div class='spell-tooltip'>
				<div class='spell-tooltip-header'>
					<b>${spell.name}</b>
				</div>
				${effects}
			</div>
		`;
	}

	createUnitHtml(position, unit) {
		/* eslint-disable max-len */
		const activeHero = this.getHeroByPosition(position);
		const activeUnit = this.getUnitByPosition(position);

		const specialtyAttackBonus = damageService.calculateSpecialtyAttackBonus(
			activeHero,
			activeUnit
		);
		const specialtyDefenseBonus = damageService.calculateSpecialtyDefenseBonus(
			activeHero,
			activeUnit
		);

		const createStatHtml = (title, baseDmg, buffedDmg) => {
			const isBuffed = buffedDmg > baseDmg;
			const isReduced = buffedDmg < baseDmg;

			const statBonusClasses = `stat-bonus ${isBuffed ? 'buffed' : ''} ${
				isReduced ? 'reduced' : ''
			}`;

			const statBonus = `<span class="${statBonusClasses}">(${buffedDmg})</span>`;

			return `
				<p>
				${title}: <span>${baseDmg}${isBuffed || isReduced ? statBonus : ''}</span></p>
      `;
		};

		let slayerAttackBonus = 0;

		if (position === 'attacker') {
			slayerAttackBonus = damageService.calculateSlayerAttackSkillBonus(
				this.getUnitByPosition('attacker'),
				this.getUnitByPosition('defender')
			);
		}

		const buffedAttack =
			unit.totalAttackSkill +
			activeHero.attack +
			slayerAttackBonus +
			specialtyAttackBonus;

		const buffedDefense =
			unit.totalDefenseSkill + activeHero.defense + specialtyDefenseBonus;

		return `
      <div id="${position}">
        <p>${unit.name}</p>

        <div class="content">
          <div class="image-container">
            <div class="unit-count">
							<input
								class="unit-count-field"
								type="number"
								value="${unit.count}"
								max="9999"
								data-position="${position}"
							/>
						</div>

            <img src="./img/${unit.image}" />
          </div>

          <div class="stats">
            ${createStatHtml('Attack', unit.attack, buffedAttack)}
            ${createStatHtml('Defense', unit.defense, buffedDefense)}
            ${createStatHtml('Min Damage', unit.minDamage, unit.minTotalDamage)}
            ${createStatHtml('Max Damage', unit.maxDamage, unit.maxTotalDamage)}
            <p>Health: <span>${unit.health}</span></p>
          </div>
        </div>

        <div class="spells">
          ${this.createSpellsHtml(position, unit.spells)}
        </div>
      </div>
    `;
	}

	bindListeners() {
		const spells = document.getElementsByClassName('spell');

		for (let i = 0; i < spells.length; i += 1) {
			const button = spells[i];
			const { spell, position, school } = button.dataset;

			button.onclick = this.selectSpell.bind(this, position, spell, school);
		}

		const unitCounts = document.getElementsByClassName('unit-count-field');

		for (let i = 0; i < unitCounts.length; i += 1) {
			const field = unitCounts[i];
			field.onchange = (event) => {
				const { value, dataset } = event.target;
				const activeUnit = this.getUnitByPosition(dataset.position);

				activeUnit.count = value;

				this.render();
			};
		}

		this.attackerHeroView.bindListeners();
		this.defenderHeroView.bindListeners();

		tippy('.spell');
	}

	renderResults() {
		const detailedDamageInfo = damageService.detailedTotalDamageCalculation(
			this.attackerHero,
			this.defenderHero,
			this.attackerUnit,
			this.defenderUnit
		);

		this.resultsView = new ResultsView('results');
		this.resultsView.render(detailedDamageInfo);
	}
}

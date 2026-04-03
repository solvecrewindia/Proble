import char1 from '../../characters/1.webp';
import char2 from '../../characters/2.webp';
import char3 from '../../characters/3.webp';
import char4 from '../../characters/4.webp';
import char5 from '../../characters/5.png';

export const CHARACTERS = [
    { id: '1', src: char1, name: 'Ninja' },
    { id: '2', src: char2, name: 'Robot' },
    { id: '3', src: char3, name: 'Mage' },
    { id: '4', src: char4, name: 'Knight' },
    { id: '5', src: char5, name: 'Dragon' }
];

export const getCharacterSrc = (id: string | null) => {
    const char = CHARACTERS.find(c => c.id === id);
    return char ? char.src : null;
};

import React from 'react';
import PropTypes from 'prop-types';

const SEARCH_RESULT_LENGTH = 3;

const SearchResultsList = ({ res }) => {
  return (
    <div>
      {res.slice(0, SEARCH_RESULT_LENGTH).map(value => (
        <div id="search-div" className="search-item">
          <strong>{value.title[0] && value.title[0].length > 50 ? `${value.title[0].substring(0, 47)}...` : value.title[0]}</strong>
          <br />
          {(value.text.length > 200) ? `${value.text.substring(0, 197)}...` : value.text}
          <br />
          {<a target="_blank" rel="noopener noreferrer">Full Document</a>}
          <div id={value.id} hidden>{value.text}</div>
        </div>)
      )}
    </div>);
};

SearchResultsList.propTypes = {
  res: PropTypes.array.isRequired,
};

export default SearchResultsList;

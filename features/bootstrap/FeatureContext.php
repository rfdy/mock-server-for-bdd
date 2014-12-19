<?php

use Behat\Behat\Context\ClosuredContextInterface,
    Behat\Behat\Context\TranslatedContextInterface,
    Behat\Behat\Context\BehatContext,
    Behat\Behat\Exception\PendingException;
use Behat\Gherkin\Node\PyStringNode,
    Behat\Gherkin\Node\TableNode;
use Behat\Behat\Event\ScenarioEvent;
use Behat\Mink\Mink,
    Behat\Mink\Session,
    Behat\Mink\Driver\GoutteDriver;

require_once('vendor/autoload.php');
require_once('MocksContext.php');


/**
 * Features context.
 */
class FeatureContext extends BehatContext
{
    private $session=array();

    /**
     * Initializes context.
     * Every scenario gets it's own context object.
     *
     * @param array $parameters context parameters (set them up through behat.yml)
     */
    public function __construct(array $parameters){
        $this->useContext('mocks_context_alias', new MocksContext());
    }

    /**
     * @Given /^Everything is setup$/
     */
    public function everythingIsSetup()
    {
        //nothing to do
    }

    /**
     * @When /^I go to the "([^"]*)"$/
     */
    public function iGoToThe($url)
    {
        $client = new GuzzleHttp\Client();
        $request = $client->createRequest('GET', 'http://127.0.0.1/'.$url);
        $request->setPort(2100);
        $res = $client->send($request);
        $this->session['http_code']=$res->getStatusCode();
        $this->session['content-type']=$res->getHeader('content-type');
        $this->session['body']=$res->getBody();
    }

    /**
     * @Then /^I expect to get http code "([^"]*)"$/
     */
    public function iExpectToGetHttpCode($arg1)
    {
        if ($this->session['http_code']!=$arg1) {
            throw new Exception("Wrong http code");
        }
    }

    /**
     * @Given /^I expect the response to contain "([^"]*)"$/
     */
    public function iExpectTheResponseToContain($arg1)
    {

        if (strpos($this->session['body'], $arg1) === false) {
            throw new Exception("response does not contain ".$arg1);
        }
    }

    /**
     * @Given /^I expect the response to not contain "([^"]*)"$/
     */
    public function iExpectTheResponseToNotContain($arg1)
    {
        if (strpos($this->session['body'], $arg1) !== false) {
            throw new Exception("response does contains ".$arg1);
        }
    }

}

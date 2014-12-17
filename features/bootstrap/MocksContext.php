<?php

use Behat\Behat\Context\ClosuredContextInterface,
    Behat\Behat\Context\TranslatedContextInterface,
    Behat\Behat\Context\BehatContext,
    Behat\Behat\Exception\PendingException;
use Behat\Gherkin\Node\PyStringNode,
    Behat\Gherkin\Node\TableNode;
use Behat\Behat\Event\ScenarioEvent;
use Behat\Behat\Context\Step;
use Behat\Mink\Mink,
    Behat\Mink\Session,
    Behat\Mink\Driver\GoutteDriver;

require_once('vendor/autoload.php');
require_once('FeatureContext.php');

/**
 * Features context.
 */

class MocksContext extends BehatContext {

    private $mocklistfiles = ["wikipedia_mocks.txt"];
    /**
     * @Given /^I enable "([^"]*)" mockserver$/
     */
    public function iEnableMockserver($arg1)
    {
        $pid = shell_exec("node mockserver.js -api " . $arg1 . " > /dev/null & echo $!");
        $this->mock_pids[$arg1] = $pid;
    }

    public function is_running($PID){
        exec("ps $PID", $ProcessState);
        return(count($ProcessState) >= 2);
    }


    /** @AfterScenario */
    public function after($event)
    {
        foreach ($this->mock_pids as $pid) {
            if ($this->is_running($pid)) {
                exec("kill -KILL $pid");
            }
        }
        // Wipe all mocklist files
        foreach ($this->mocklistfiles as $file) {
            // Delete them
            file_put_contents($file, "");
        }

    }

        // TODO: How to verify mock is used?


    /**
     * @Given /^I enable "([^"]*)" mockfile "([^"]*)"$/
     */
    public function iEnableMockfile1($api, $mockfile)
    {
        switch ($api) {
            case "wikipedia.org":
                $mocklistfile = "wikipedia_mocks.txt";
                break;
            default:
                throw new Exception("Invalid mock api");
        }

        file_put_contents($mocklistfile, $mockfile . "\n", FILE_APPEND);
    }


}
